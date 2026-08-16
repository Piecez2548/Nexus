import { resolveConcurrency } from "@/features/finance/slipScanner/queue/scanQueueConfig";

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// TEMPORARY perf-investigation instrumentation helper (Tesseract bottleneck
// investigation) -- formats a nullable measurement for a log line without
// TypeScript's narrowing getting confused by an inline ternary on a mutable
// object property. Remove once confirmed/fixed.
function fmtNullableMs(value: number | null): string {
  return value === null ? "null" : String(Math.round(value));
}

function fmtNullableFraction(value: number | null): string {
  return value === null ? "null" : value.toFixed(2);
}

// Memoized so concurrent first-time worker spawns (e.g. several queue lanes
// all needing a worker at scan start) share one dynamic import instead of
// each triggering their own -- the runtime would cache the module either
// way, but this also avoids any chance of two first-time imports of the same
// specifier racing.
let tesseractModulePromise: Promise<typeof import("tesseract.js")> | null = null;
function loadTesseract(): Promise<typeof import("tesseract.js")> {
  if (!tesseractModulePromise) tesseractModulePromise = import("tesseract.js");
  return tesseractModulePromise;
}

interface PooledWorker {
  // Tesseract's own Worker type (avoids a static import of tesseract.js here
  // so the WASM engine stays out of the bundle until first actually used —
  // same reasoning as slipOcr.ts's dynamic import).
  worker: { recognize: (image: Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
  busy: boolean;
  // TEMPORARY perf-investigation instrumentation (Tesseract bottleneck
  // investigation) -- populated by the `logger` option passed to
  // createWorker(), which receives Tesseract's own native progress events
  // (including WASM-side "recognizing text" ticks fired *during* the actual
  // OCR computation, via a C++ callback -- see tesseract.js's
  // worker-script/index.js). Reset before each recognize() call; read after
  // it resolves to split "time to first native progress tick" (dispatch +
  // transfer + setImage) from "time between first and last tick" (the
  // actual native OCR computation) from "time after the last tick to
  // resolve" (result dump/formatting + response transfer) -- without
  // patching tesseract.js itself. Remove once confirmed/fixed.
  firstRecognizeProgressAt: number | null;
  lastRecognizeProgressAt: number | null;
  lastRecognizeProgressValue: number | null;
  recognizeProgressTicks: number;
}

// Reuses a small pool of Tesseract workers across every OCR call in an app
// session instead of spinning one up per image and tearing it down
// immediately after (the original behavior) -- each worker init reloads the
// "tha+eng" WASM engine + language data, by far the dominant per-image cost
// when scanning a large gallery (most photos aren't slips, so nearly every
// one falls through to OCR). slipOcr.ts's recognizeSlipTextBatch already
// documents this exact tradeoff for the single-slip picker flow; this closes
// the same gap for the gallery scanner engine (ocrRecognizer.ts).
//
// Sized to the scan queue's own concurrency (scanQueueConfig.ts) so N images
// can still be OCR'd genuinely in parallel -- a single shared worker would
// serialize every recognition (one WASM instance, one job at a time),
// throwing away the queue's own parallelism.
//
// Deliberately never torn down during normal operation: workers stay warm
// for the lifetime of the app (or the test file, via resetOcrWorkerPoolForTests)
// so a second scan -- even a fresh one, not just an incremental re-scan --
// doesn't pay the init cost again either.
class OcrWorkerPool {
  private readonly maxSize: number;
  private readonly idle: PooledWorker[] = [];
  private totalCount = 0; // includes workers currently being created
  private readonly waiters: Array<(pooled: PooledWorker) => void> = [];

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
  }

  private async spawnWorker(): Promise<PooledWorker> {
    // TEMPORARY perf-investigation instrumentation (OCR bottleneck
    // investigation) -- a worker spawn (WASM engine + "tha+eng" language
    // data load) is a real, one-time-per-slot cost; distinguishing it from
    // ordinary queue wait matters since it can only happen for the first
    // maxSize recognize() calls in an app session. Remove once confirmed.
    const spawnStart = perfNow();
    const { createWorker } = await loadTesseract();

    const pooled: PooledWorker = {
      // Placeholder; replaced below once createWorker resolves. The logger
      // callback closes over `pooled` itself, so it must exist first.
      worker: null as unknown as PooledWorker["worker"],
      busy: true,
      firstRecognizeProgressAt: null,
      lastRecognizeProgressAt: null,
      lastRecognizeProgressValue: null,
      recognizeProgressTicks: 0,
    };

    // TEMPORARY perf-investigation instrumentation (Tesseract bottleneck
    // investigation) -- Tesseract's own supported logger option, not a
    // node_modules patch. "recognizing text" progress ticks fire from a
    // native (WASM) callback *during* api.Recognize(null) itself, so their
    // timestamps mark real native-computation boundaries. Remove once
    // confirmed/fixed.
    const worker = await createWorker("tha+eng", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status !== "recognizing text") return;
        const now = perfNow();
        if (pooled.firstRecognizeProgressAt === null) pooled.firstRecognizeProgressAt = now;
        pooled.lastRecognizeProgressAt = now;
        pooled.lastRecognizeProgressValue = m.progress;
        pooled.recognizeProgressTicks += 1;
      },
    });
    pooled.worker = worker;

    const spawnMs = perfNow() - spawnStart;
    console.debug(`[perf-investigation] ocrWorkerSpawn spawnMs=${Math.round(spawnMs)} totalCount=${this.totalCount} maxSize=${this.maxSize}`);
    return pooled;
  }

  // The synchronous prefix here (the idle-pop and totalCount check/increment)
  // runs to completion before any `await`, so concurrent calls in the same
  // tick (e.g. every queue lane starting at once) each see an up-to-date
  // totalCount -- the same race-free pattern scanSessionService.ts's
  // seenContent map relies on.
  private acquire(): { pooled: Promise<PooledWorker>; source: "idle" | "spawn" | "wait" } {
    const free = this.idle.pop();
    if (free) {
      free.busy = true;
      return { pooled: Promise.resolve(free), source: "idle" };
    }

    if (this.totalCount < this.maxSize) {
      this.totalCount++;
      return { pooled: this.spawnWorker(), source: "spawn" };
    }

    return { pooled: new Promise((resolve) => this.waiters.push(resolve)), source: "wait" };
  }

  private release(pooled: PooledWorker): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(pooled); // still marked busy -- handed directly to the next waiter
      return;
    }
    pooled.busy = false;
    this.idle.push(pooled);
  }

  async recognize(bytes: Uint8Array): Promise<string> {
    const acquireStart = perfNow();
    const { pooled: pooledPromise, source } = this.acquire();
    const pooled = await pooledPromise;
    const acquireMs = perfNow() - acquireStart;
    try {
      // Reset the native-progress tracker for this specific call -- see the
      // PooledWorker interface comment. Safe: this worker is exclusively
      // ours until release() below, so no other recognize() call's progress
      // ticks can land here concurrently.
      pooled.firstRecognizeProgressAt = null;
      pooled.lastRecognizeProgressAt = null;
      pooled.lastRecognizeProgressValue = null;
      pooled.recognizeProgressTicks = 0;

      const recognizeStart = perfNow();
      const {
        data: { text },
      } = await pooled.worker.recognize(new Blob([bytes as unknown as BlobPart]));
      const recognizeMs = perfNow() - recognizeStart;

      // TEMPORARY perf-investigation instrumentation (Tesseract bottleneck
      // investigation) -- splits recognizeMs using Tesseract's own native
      // progress ticks (see spawnWorker's logger): time to the first tick
      // (dispatch + transfer + setImage + native startup), time between
      // first and last tick (the actual native OCR computation), and time
      // after the last tick until resolve (result dump/formatting for
      // whichever output formats were requested + response transfer).
      // Remove once confirmed/fixed.
      const toFirstTickMs = pooled.firstRecognizeProgressAt !== null ? pooled.firstRecognizeProgressAt - recognizeStart : null;
      const nativeComputeMs =
        pooled.firstRecognizeProgressAt !== null && pooled.lastRecognizeProgressAt !== null
          ? pooled.lastRecognizeProgressAt - pooled.firstRecognizeProgressAt
          : null;
      const postTickMs = pooled.lastRecognizeProgressAt !== null ? perfNow() - pooled.lastRecognizeProgressAt : null;
      // Explicit annotation deliberate: pooled.lastRecognizeProgressValue is
      // set to null a few lines above, then only reassigned inside a
      // closure defined in a *different* function (spawnWorker's logger) --
      // TypeScript's control-flow narrowing can't see that cross-closure
      // mutation and would otherwise (incorrectly, since the logger really
      // can run during the intervening await) narrow this to `null` only.
      const lastProgressValueStr = fmtNullableFraction(pooled.lastRecognizeProgressValue);

      // TEMPORARY perf-investigation instrumentation (OCR bottleneck
      // investigation) -- acquireMs for source=spawn includes the worker
      // init cost logged separately above (ocrWorkerSpawn); source=wait is
      // genuine queue contention (all maxSize workers busy); source=idle
      // should be ~instant. recognizeMs is the actual Tesseract engine call.
      // Remove once confirmed.
      console.debug(
        `[perf-investigation] ocrRecognize inputBytes=${bytes.length} acquireSource=${source} acquireMs=${Math.round(acquireMs)} recognizeMs=${Math.round(recognizeMs)} toFirstTickMs=${fmtNullableMs(toFirstTickMs)} nativeComputeMs=${fmtNullableMs(nativeComputeMs)} postTickMs=${fmtNullableMs(postTickMs)} progressTicks=${pooled.recognizeProgressTicks} lastProgressValue=${lastProgressValueStr} idleCount=${this.idle.length} totalCount=${this.totalCount} waitersCount=${this.waiters.length}`,
      );
      return text;
    } finally {
      this.release(pooled);
    }
  }

  // Only reclaims idle workers -- any mid-recognition worker finishes its
  // current job and is released back to a pool that will simply spawn a
  // replacement next time totalCount allows it. Production code never calls
  // this (see the class comment); it exists for test isolation.
  async terminate(): Promise<void> {
    const idleWorkers = this.idle.splice(0, this.idle.length);
    this.waiters.length = 0;
    this.totalCount = 0;
    await Promise.all(idleWorkers.map((w) => w.worker.terminate()));
  }
}

let sharedPool: OcrWorkerPool | null = null;

export function getOcrWorkerPool(): OcrWorkerPool {
  if (!sharedPool) sharedPool = new OcrWorkerPool(resolveConcurrency());
  return sharedPool;
}

// Test-only: drop the shared pool (after terminating its idle workers) so
// each test file starts with fresh worker mocks instead of inheriting one
// left over from a previous test file's module-level singleton.
export async function resetOcrWorkerPoolForTests(): Promise<void> {
  if (sharedPool) await sharedPool.terminate();
  sharedPool = null;
}
