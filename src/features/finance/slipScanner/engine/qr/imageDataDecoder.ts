import jsQR from "jsqr";

import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

// Concrete QrDecoder for a browser / native WebView: decode the image bytes to
// pixels (createImageBitmap → OffscreenCanvas → ImageData) and run jsQR over
// them. jsQR is referenced only here — everything else depends on the QrDecoder
// interface. In a non-browser context (the jsdom test env), or for an
// undecodable image, it degrades to null (no QR) instead of throwing; real
// on-device decoding is verified in the browser/APK later.
export const imageDataQrDecoder: QrDecoder = {
  async decode(bytes: Uint8Array): Promise<string | null> {
    if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;

    try {
      const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const result = jsQR(image.data, image.width, image.height);
      return result?.data ?? null;
    } catch {
      return null;
    }
  },
};
