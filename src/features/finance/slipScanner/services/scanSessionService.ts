import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
import { scannedAssetRepository } from "@/features/finance/slipScanner/repositories/scannedAssetRepository";
import { sha256Hex } from "@/features/finance/slipScanner/engine/hash/contentHash";
import { recordingProcessor, type ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { ScanOptions, ScanProgress, ScanStatus, SlipScanRun } from "@/features/finance/slipScanner/models/scanTypes";

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

// Yields to the event loop between images so a large scan never blocks the UI
// thread — the platform-independent form of "background scanning". True OS
// background (a foreground service) is a later native task; this already
// keeps the app responsive on web and inside the native WebView.
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// The scan orchestration. Deliberately depends only on the MediaProvider
// interface and the two local repositories — no Capacitor, no plugin — so it
// is fully platform-independent. Owns: scan-all, incremental skip, duplicate
// prevention, progress reporting, pause/resume/cancel, cooperative
// backgrounding, and session persistence (resume after an app restart).
export function createScanSession(params: ScanSessionParams): ScanSession {
  const processor = params.processor ?? recordingProcessor;

  let status: ScanStatus = "idle";
  let runId: number | null = null;
  let cancelled = false;
  let pauseGate: Promise<void> | null = null;
  let releasePause: (() => void) | null = null;

  function pause(): void {
    if (status !== "running") return;
    status = "paused";
    pauseGate = new Promise((resolve) => {
      releasePause = resolve;
    });
    if (runId !== null) void scanRunRepository.checkpoint(runId, { status: "paused" }).catch(() => {});
  }

  function resume(): void {
    if (status !== "paused") return;
    status = "running";
    releasePause?.();
    pauseGate = null;
    releasePause = null;
    if (runId !== null) void scanRunRepository.checkpoint(runId, { status: "running" }).catch(() => {});
  }

  function cancel(): void {
    cancelled = true;
    // Release any pause so the loop wakes, observes the cancel, and exits.
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

    // Resume an interrupted session (only for incremental scans), else start
    // fresh. Resuming reuses the persisted counters + cursor watermark.
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

    for await (const asset of params.provider.enumerate(cursor)) {
      await waitWhilePaused();
      if (cancelled) break;

      try {
        if (await scannedAssetRepository.hasAsset(asset.assetId)) {
          progress.skipped++; // incremental: this asset was already scanned
        } else {
          const bytes = await params.provider.readBytes(asset);
          const contentHash = await sha256Hex(bytes);
          if (await scannedAssetRepository.hasContent(contentHash)) {
            progress.skipped++; // duplicate content (same image, different asset)
          } else {
            await processor.process(asset, bytes, contentHash, runId);
            await scannedAssetRepository.record({ assetId: asset.assetId, contentHash, runId, scannedAt: nowIso() });
            progress.done++;
          }
        }
      } catch {
        progress.failed++; // one bad image never aborts the batch
      }

      cursor = asset.capturedAt ?? cursor;
      await scanRunRepository.checkpoint(runId, {
        done: progress.done,
        skipped: progress.skipped,
        failed: progress.failed,
        cursor,
      });
      params.onProgress?.(progress, status);
      await yieldToEventLoop();
    }

    const finalStatus: ScanStatus = cancelled ? "cancelled" : "completed";
    status = finalStatus;
    await scanRunRepository.finish(runId, finalStatus, nowIso());
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
