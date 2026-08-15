import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

// The per-image work seam. GS-006 (orchestration) treats processing as
// pluggable so the extraction pipeline (QR detect → EMVCo parse → OCR
// fallback → candidate, GS-009+) can be injected later WITHOUT changing the
// scan loop. The default below does no extraction — recording the scanned
// asset (done by the orchestrator) is the only output for now.
export interface ScanProcessor {
  // isCancelled lets a slow processor (real extraction: QR recovery, OCR)
  // check for a mid-flight cancel between its own internal stages, rather
  // than only being interruptible between whole assets -- runConcurrentQueue
  // already re-checks cancellation on its own retry loop, so a processor
  // that notices cancellation and throws is enough; it does not need to
  // distinguish that from a real failure.
  process(
    asset: GalleryAssetRef,
    bytes: Uint8Array,
    contentHash: string,
    runId: number,
    isCancelled: () => boolean,
  ): Promise<void>;
}

export const recordingProcessor: ScanProcessor = {
  async process(): Promise<void> {
    // No-op: GS-006 only enumerates, hashes, dedupes and records. Extraction
    // is a later task that supplies a richer ScanProcessor here.
  },
};
