import { extractSlipCandidate, type ExtractSlipInput } from "@/features/finance/slipScanner/import/extractSlipCandidate";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";

export type SlipExtractor = (input: ExtractSlipInput) => Promise<SlipCandidate>;

// The real per-image work for the GS-006 scan orchestration (the concurrent,
// byte-budgeted, cacheable, pause/resume/cancel-able queue) — closes the gap
// the architecture review found: `createScanSession` has always defaulted to
// `recordingProcessor` (a no-op), so the orchestration has never driven real
// extraction. This mirrors `createQrScanProcessor`'s callback shape (GS-009)
// now that the full extraction pipeline (GS-009..012: QR detect -> EMVCo parse
// -> bank identify -> OCR fallback) exists to fill it. What `onCandidate` does
// with the result — store it, queue it for review, import it — is deliberately
// the caller's decision, not this processor's; it stays a pure adapter between
// the scan queue and extraction. `runId` is passed through so a caller can
// persist the candidate against the scan run it came from (BUG-05 fix).
export function createSlipExtractionProcessor(
  onCandidate: (asset: GalleryAssetRef, candidate: SlipCandidate, runId: number) => void | Promise<void>,
  extractor: SlipExtractor = extractSlipCandidate,
): ScanProcessor {
  return {
    async process(asset: GalleryAssetRef, bytes: Uint8Array, _contentHash: string, runId: number, isCancelled: () => boolean): Promise<void> {
      const candidate = await extractor({ assetId: asset.assetId, bytes, isCancelled });
      await onCandidate(asset, candidate, runId);
    },
  };
}
