import { resolveConcurrency } from "@/features/finance/slipScanner/queue/scanQueueConfig";

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
  worker: { recognize: (image: ImageData | Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
  busy: boolean;
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
    const { createWorker } = await loadTesseract();
    const worker = await createWorker("tha+eng");
    return { worker, busy: true };
  }

  // The synchronous prefix here (the idle-pop and totalCount check/increment)
  // runs to completion before any `await`, so concurrent calls in the same
  // tick (e.g. every queue lane starting at once) each see an up-to-date
  // totalCount -- the same race-free pattern scanSessionService.ts's
  // seenContent map relies on.
  private acquire(): Promise<PooledWorker> {
    const free = this.idle.pop();
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }

    if (this.totalCount < this.maxSize) {
      this.totalCount++;
      return this.spawnWorker();
    }

    return new Promise((resolve) => this.waiters.push(resolve));
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

  // Takes an already-Tesseract-ready image (ImageData or Blob) rather than
  // raw bytes -- preprocessForOcr produces one directly (see its own header
  // comment for why encoding to bytes here and re-decoding on Tesseract's
  // side was an expensive, unnecessary round trip).
  async recognize(image: ImageData | Blob): Promise<string> {
    const pooled = await this.acquire();
    try {
      const {
        data: { text },
      } = await pooled.worker.recognize(image);
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
