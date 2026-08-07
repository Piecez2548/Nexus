import { imageDataQrDecoder } from "@/features/finance/slipScanner/engine/qr/imageDataDecoder";
import type { QrDecoder, QrDetectionResult } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

// The QR detector runs a decoder over an image's bytes and reports whether a QR
// was present and, if so, its raw payload. It deliberately does no parsing — a
// slip QR payload is handed on verbatim; interpreting it (EMVCo/PromptPay) is
// GS-010. Non-QR images resolve to { hasQr: false, payload: null } rather than
// throwing, so a whole-gallery scan flows past photos that aren't slips.
export interface QrDetector {
  detect(bytes: Uint8Array): Promise<QrDetectionResult>;
}

export function createQrDetector(decoder: QrDecoder): QrDetector {
  return {
    async detect(bytes: Uint8Array): Promise<QrDetectionResult> {
      const payload = await decoder.decode(bytes);
      return payload !== null ? { hasQr: true, payload } : { hasQr: false, payload: null };
    },
  };
}

// Default detector backed by the browser/WebView image-pixel decoder.
export const defaultQrDetector: QrDetector = createQrDetector(imageDataQrDecoder);
