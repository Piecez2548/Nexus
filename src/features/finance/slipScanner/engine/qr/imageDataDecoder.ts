import jsQR from "jsqr";

import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

// Decode image bytes to pixels for jsQR. Prefers OffscreenCanvas but falls back
// to a DOM <canvas> — some Android WebViews don't expose OffscreenCanvas, which
// silently broke on-device QR decoding (everything fell through to OCR). jsQR is
// referenced only here. Returns null (no readable image pipeline / bad image)
// instead of throwing.
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

  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, width, height);
    }
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, width, height);
    }
  }

  return null;
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
