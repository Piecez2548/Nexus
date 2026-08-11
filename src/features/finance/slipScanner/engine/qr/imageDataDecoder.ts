import jsQR from "jsqr";

import { makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

// Decode image bytes to pixels for jsQR, via the shared OffscreenCanvas/DOM
// <canvas> fallback (some Android WebViews don't expose OffscreenCanvas, which
// silently broke on-device QR decoding — everything fell through to OCR). jsQR
// is referenced only here. Returns null (no readable image pipeline / bad
// image) instead of throwing.
async function toImageData(bytes: Uint8Array): Promise<ImageData | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
  } catch {
    return null;
  }
  const { width, height } = bitmap;
  if (width === 0 || height === 0) return null;

  const target = makeCanvas(width, height);
  if (!target) return null;
  target.ctx.drawImage(bitmap, 0, 0);
  return target.ctx.getImageData(0, 0, width, height);
}

export const imageDataQrDecoder: QrDecoder = {
  async decode(bytes: Uint8Array): Promise<string | null> {
    try {
      const image = await toImageData(bytes);
      if (!image) return null;
      return jsQR(image.data, image.width, image.height)?.data ?? null;
    } catch {
      return null;
    }
  },
};
