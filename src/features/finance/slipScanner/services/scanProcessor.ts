import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

// The per-image work seam. GS-006 (orchestration) treats processing as
// pluggable so the extraction pipeline (QR detect → EMVCo parse → OCR
// fallback → candidate, GS-009+) can be injected later WITHOUT changing the
// scan loop. The default below does no extraction — recording the scanned
// asset (done by the orchestrator) is the only output for now.
export interface ScanProcessor {
  process(asset: GalleryAssetRef, bytes: Uint8Array, contentHash: string, runId: number): Promise<void>;
}

export const recordingProcessor: ScanProcessor = {
  async process(): Promise<void> {
    // No-op: GS-006 only enumerates, hashes, dedupes and records. Extraction
    // is a later task that supplies a richer ScanProcessor here.
  },
};
