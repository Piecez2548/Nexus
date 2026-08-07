import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
import { scannedAssetRepository } from "@/features/finance/slipScanner/repositories/scannedAssetRepository";
import { sha256Hex } from "@/features/finance/slipScanner/engine/hash/contentHash";
import { recordingProcessor, type ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import { runConcurrentQueue } from "@/features/finance/slipScanner/queue/runConcurrentQueue";
import { ByteBudget } from "@/features/finance/slipScanner/queue/byteBudget";
import {
  DEFAULT_IMAGE_BYTES,
  DEFAULT_MAX_INFLIGHT_BYTES,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  resolveConcurrency,
} from "@/features/finance/slipScanner/queue/scanQueueConfig";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { GalleryAssetRef, ScanOptions, ScanProgress, ScanStatus, SlipScanRun } from "@/features/finance/slipScanner/models/scanTypes";

export interface ScanControl {
  pause(): void;
  resume(): void;
  cancel(): void;
  readonly status: ScanStatus;
}

export interface ScanSessionParams {
  provider: MediaProvider;
  options: ScanOptions;
  // Per-image work (extraction) — defaults to a no-op recorder (GS-006 only
  // enumerates/hashes/dedupes/records; extraction plugs in here later).
  processor?: ScanProcessor;
  onProgress?: (progress: ScanProgress, status: ScanStatus) => void;
}

export interface ScanSession {
  control: ScanControl;
  done: Promise<SlipScanRun>;
}

function nowIso(): string {
  return new Date().toISOString();
}

// The scan orchestration. Depends only on the MediaProvider interface, the two
// local repositories, and the concurrent queue — no Capacitor, no plugin — so
// it stays fully platform-independent. Owns: scan-all, incremental skip,
// duplicate prevention, progress reporting, pause/resume/cancel, session
// persistence (resume after an app restart), and — via runConcurrentQueue
// (GS-007) — concurrent workers, retry, and byte-budget memory protection.
export function createScanSession(params: ScanSessionParams): ScanSession {
  const processor = params.processor ?? recordingProcessor;

  let status: ScanStatus = "idle";
  let runId = 0; // 0 = not created yet (Dexie ids start at 1)
  let cancelled = false;
  let pauseGate: Promise<void> | null = null;
  let releasePause: (() => void) | null = null;

  function pause(): void {
    if (status !== "running") return;
    status = "paused";
    pauseGate = new Promise((resolve) => {
      releasePause = resolve;
    });
    if (runId > 0) void scanRunRepository.checkpoint(runId, { status: "paused" }).catch(() => {});
  }

  function resume(): void {
    if (status !== "paused") return;
    status = "running";
    releasePause?.();
    pauseGate = null;
    releasePause = null;
    if (runId > 0) void scanRunRepository.checkpoint(runId, { status: "running" }).catch(() => {});
  }

  function cancel(): void {
    cancelled = true;
    // Release any pause so parked workers wake, observe the cancel, and exit.
    releasePause?.();
    pauseGate = null;
    releasePause = null;
  }

  async function waitWhilePaused(): Promise<void> {
    if (pauseGate) await pauseGate;
  }

  async function run(): Promise<SlipScanRun> {
    const progress: ScanProgress = { total: null, done: 0, skipped: 0, failed: 0 };
    let cursor: string | undefined;

    // Resume an interrupted session (incremental only), else start fresh.
    const resumable = params.options.incremental ? await scanRunRepository.getResumable() : undefined;
    if (resumable?.id !== undefined) {
      runId = resumable.id;
      cursor = resumable.cursor;
      progress.total = resumable.total;
      progress.done = resumable.done;
      progress.skipped = resumable.skipped;
      progress.failed = resumable.failed;
      await scanRunRepository.checkpoint(runId, { status: "running" });
    } else {
      progress.total = await params.provider.count(params.options.incremental ? cursor : undefined);
      runId = await scanRunRepository.create({
        status: "running",
        source: params.options.source,
        startedAt: nowIso(),
        total: progress.total,
        done: 0,
        skipped: 0,
        failed: 0,
      });
    }

    status = "running";
    params.onProgress?.(progress, status);

    const budget = new ByteBudget(params.options.maxInflightBytes ?? DEFAULT_MAX_INFLIGHT_BYTES);
    // Within-run content dedup. The has()+add() below run synchronously with
    // no await between them, so concurrent workers can't both pass the check
    // for the same content — the cross-run DB check alone would race under
    // concurrency.
    const seenContent = new Set<string>();
    let maxCapturedAt = cursor;

    async function handleAsset(asset: GalleryAssetRef): Promise<void> {
      if (asset.capturedAt && (!maxCapturedAt || asset.capturedAt > maxCapturedAt)) maxCapturedAt = asset.capturedAt;

      if (await scannedAssetRepository.hasAsset(asset.assetId)) {
        progress.skipped++; // incremental: this asset was already scanned
        return;
      }

      const estBytes = asset.bytes ?? DEFAULT_IMAGE_BYTES;
      await budget.acquire(estBytes);
      try {
        const bytes = await params.provider.readBytes(asset);
        const contentHash = await sha256Hex(bytes);

        if (seenContent.has(contentHash)) {
          progress.skipped++; // duplicate content within this run
          return;
        }
        seenContent.add(contentHash); // reserve synchronously (race-free)

        if (await scannedAssetRepository.hasContent(contentHash)) {
          progress.skipped++; // duplicate content from a previous run
          return;
        }

        await processor.process(asset, bytes, contentHash, runId);
        await scannedAssetRepository.record({ assetId: asset.assetId, contentHash, runId, scannedAt: nowIso() });
        progress.done++;
      } finally {
        budget.release(estBytes);
      }
    }

    await runConcurrentQueue<GalleryAssetRef>({
      source: params.provider.enumerate(cursor),
      handler: handleAsset,
      concurrency: resolveConcurrency(params.options.concurrency),
      maxRetries: params.options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: params.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      waitWhilePaused,
      isCancelled: () => cancelled,
      onSettled: async ({ ok }) => {
        if (!ok) progress.failed++; // one bad image (after retries) never aborts the batch
        await scanRunRepository.checkpoint(runId, {
          done: progress.done,
          skipped: progress.skipped,
          failed: progress.failed,
        });
        params.onProgress?.(progress, status);
      },
    });

    const finalStatus: ScanStatus = cancelled ? "cancelled" : "completed";
    status = finalStatus;
    await scanRunRepository.finish(runId, finalStatus, nowIso());
    // Only advance the incremental cursor on a clean finish. On interruption
    // the cursor stays put and a resume re-enumerates from it, relying on the
    // assetId dedup to skip what's already done (out-of-order concurrent
    // completion means the cursor can't safely advance mid-run).
    if (!cancelled && maxCapturedAt) await scanRunRepository.checkpoint(runId, { cursor: maxCapturedAt });
    params.onProgress?.(progress, status);

    const finalRun = await scanRunRepository.get(runId);
    if (!finalRun) throw new Error("scanSession: run record missing after finish");
    return finalRun;
  }

  const done = run().catch((err) => {
    status = "error";
    throw err;
  });

  const control: ScanControl = {
    pause,
    resume,
    cancel,
    get status() {
      return status;
    },
  };

  return { control, done };
}
