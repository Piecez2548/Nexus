import { defaultQrDetector, type QrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";

// A ScanProcessor that runs QR detection on each scanned image and, when a QR
// is present, hands its raw payload to `onQrPayload`. Images without a QR are
// ignored (the scan simply flows past them). This plugs into the GS-006 scan
// loop via the existing ScanProcessor seam without changing orchestration; it
// is not wired as the default yet because the payload has no consumer until the
// EMVCo parser (GS-010) lands.
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
