import { defaultQrDetector, type QrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";

// A ScanProcessor that runs QR detection on each scanned image and, when a QR
// is present, hands its raw payload to `onQrPayload`. Images without a QR are
// ignored (the scan simply flows past them). This plugs into the GS-006
// full-gallery scan queue (scanSessionService.ts) via the existing
// ScanProcessor seam without changing orchestration. It is NOT the live
// extraction path today: the picker-based Gallery Scan flow (useSlipScan.ts)
// calls extractSlipCandidate directly, which does QR detect → EMVCo parse →
// bank identify → OCR fallback in one step and needs no processor. This seam
// is for wiring that same extraction into the queue-based full-gallery
// auto-scan, which currently only records scanned assets (recordingProcessor)
// — building the ScanProcessor that maps a payload all the way to a stored
// SlipCandidate is separate, not-yet-scoped work.
export function createQrScanProcessor(
  onQrPayload: (asset: GalleryAssetRef, payload: string) => void | Promise<void>,
  detector: QrDetector = defaultQrDetector,
): ScanProcessor {
  return {
    async process(asset: GalleryAssetRef, bytes: Uint8Array): Promise<void> {
      const result = await detector.detect(bytes);
      if (result.hasQr && result.payload !== null) {
        await onQrPayload(asset, result.payload);
      }
    },
  };
}
