import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
import { dexieScanCache } from "@/features/finance/slipScanner/cache/dexieScanCache";
import { CURRENT_ENGINE_VERSIONS } from "@/features/finance/slipScanner/cache/scanCachePolicy";
import { sha256Hex } from "@/features/finance/slipScanner/engine/hash/contentHash";
import { createCheckpointThrottle } from "@/features/finance/slipScanner/services/checkpointThrottle";
import { recordingProcessor, type ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import { runConcurrentQueue } from "@/features/finance/slipScanner/queue/runConcurrentQueue";
import { ByteBudget } from "@/features/finance/slipScanner/queue/byteBudget";
import {
  DEFAULT_CHECKPOINT_EVERY_N,
  DEFAULT_CHECKPOINT_INTERVAL_MS,
  DEFAULT_IMAGE_BYTES,
  DEFAULT_MAX_INFLIGHT_BYTES,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  resolveConcurrency,
} from "@/features/finance/slipScanner/queue/scanQueueConfig";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { EngineVersions, ScanCache } from "@/features/finance/slipScanner/cache/scanCache";
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
  // The scan cache (GS-008) — injected so the orchestration stays independent
  // of the cache implementation; defaults to the Dexie-backed cache.
  cache?: ScanCache;
  // Extraction-engine versions stamped onto cache entries; a bump makes older
  // entries stale and re-scanned. Defaults to the current engine versions.
  engineVersions?: EngineVersions;
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
  const cache = params.cache ?? dexieScanCache;
  const versions = params.engineVersions ?? CURRENT_ENGINE_VERSIONS;

  let status: ScanStatus = "idle";
  let runId = 0; // 0 = not created yet (Dexie ids start at 1)
  let cancelled = false;
  let pauseGate: Promise<void> | null = null;
  let releasePause: (() => void) | null = null;
  // Owned by run(), but pause() also needs to read it (to flush an accurate
  // checkpoint at the moment the user steps away), so it lives out here.
  const progress: ScanProgress = { total: null, done: 0, skipped: 0, failed: 0 };

  function pause(): void {
    if (status !== "running") return;
    status = "paused";
    pauseGate = new Promise((resolve) => {
      releasePause = resolve;
    });
    // Flush current progress alongside the status, not just on the throttle's
    // own schedule — a pause is a natural "the user stepped away" moment
    // where an app kill shouldn't lose more than necessary.
    if (runId > 0) {
      void scanRunRepository
        .checkpoint(runId, { status: "paused", done: progress.done, skipped: progress.skipped, failed: progress.failed })
        .catch(() => {});
    }
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
    // Reset the shared progress object for this run (a fresh createScanSession
    // call reuses neither the closure nor this state across runs, but resuming
    // sets these fields explicitly below either way).
    progress.total = null;
    progress.done = 0;
    progress.skipped = 0;
    progress.failed = 0;
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
    // Within-run content dedup, keyed by which asset reserved a content hash
    // (not just a Set) so a *retry* of the same asset — same content, same
    // assetId — isn't mistaken for a duplicate of itself and silently skipped
    // instead of actually being retried. The has()+set() below still run
    // synchronously with no await between them, so two *different* assets with
    // the same content can't both pass the check — the cross-run DB check
    // alone would race under concurrency.
    const seenContent = new Map<string, string>(); // contentHash -> reserving assetId
    let maxCapturedAt = cursor;

    async function handleAsset(asset: GalleryAssetRef): Promise<void> {
      if (asset.capturedAt && (!maxCapturedAt || asset.capturedAt > maxCapturedAt)) maxCapturedAt = asset.capturedAt;

      // Consult the cache only for incremental scans; a non-incremental
      // (forced) scan re-processes everything but still records + dedupes.
      const decision = params.options.incremental ? await cache.decide(asset.assetId, asset.capturedAt, versions) : "scan";
      if (decision === "skip-unchanged" || decision === "skip-failed") {
        progress.skipped++; // cache hit (unchanged) or a remembered, retries-exhausted failure
        return;
      }

      const estBytes = asset.bytes ?? DEFAULT_IMAGE_BYTES;
      await budget.acquire(estBytes);
      try {
        const bytes = await params.provider.readBytes(asset);
        const contentHash = await sha256Hex(bytes);

        const reservedBy = seenContent.get(contentHash);
        if (reservedBy !== undefined && reservedBy !== asset.assetId) {
          progress.skipped++; // duplicate content within this run, from a different asset
          return;
        }
        seenContent.set(contentHash, asset.assetId); // reserve synchronously (race-free); idempotent on a retry

        if (await cache.hasContent(contentHash, asset.assetId)) {
          progress.skipped++; // duplicate content from another asset (dedup preserved)
          return;
        }

        await processor.process(asset, bytes, contentHash, runId, () => cancelled);
        await cache.recordScanned({ assetId: asset.assetId, contentHash, lastModified: asset.capturedAt, runId, versions });
        progress.done++;
      } finally {
        budget.release(estBytes);
      }
    }

    const checkpointThrottle = createCheckpointThrottle(
      params.options.checkpointIntervalMs ?? DEFAULT_CHECKPOINT_INTERVAL_MS,
      params.options.checkpointEveryN ?? DEFAULT_CHECKPOINT_EVERY_N,
    );

    await runConcurrentQueue<GalleryAssetRef>({
      source: params.provider.enumerate(cursor),
      handler: handleAsset,
      concurrency: resolveConcurrency(params.options.concurrency),
      maxRetries: params.options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: params.options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      waitWhilePaused,
      isCancelled: () => cancelled,
      onSettled: async ({ item, ok }) => {
        if (!ok) {
          // One bad image (after the queue's retries) never aborts the batch;
          // remember the failure so the cache's cross-run retry policy applies.
          progress.failed++;
          await cache.recordFailed({ assetId: item.assetId, lastModified: item.capturedAt, runId });
        }
        // Persisting on every settled item is 50k Dexie writes at 50k images;
        // coalesce to the throttle's schedule. onProgress (a plain callback,
        // no I/O) still fires every time — the UI can throttle its own
        // re-renders independently if it wants to.
        if (checkpointThrottle.shouldFlush()) {
          await scanRunRepository.checkpoint(runId, {
            done: progress.done,
            skipped: progress.skipped,
            failed: progress.failed,
          });
        }
        params.onProgress?.(progress, status);
      },
    });

    const finalStatus: ScanStatus = cancelled ? "cancelled" : "completed";
    status = finalStatus;
    // Unconditional final flush — the persisted done/skipped/failed must be
    // exact once the run ends, regardless of where the throttle's schedule
    // happened to land on the last item.
    await scanRunRepository.checkpoint(runId, { done: progress.done, skipped: progress.skipped, failed: progress.failed });
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
