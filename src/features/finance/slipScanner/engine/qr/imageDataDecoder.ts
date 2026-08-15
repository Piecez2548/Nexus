import jsQR from "jsqr";

import { makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Decode image bytes to pixels for jsQR, via the shared OffscreenCanvas/DOM
// <canvas> fallback (some Android WebViews don't expose OffscreenCanvas, which
// silently broke on-device QR decoding — everything fell through to OCR). jsQR
// is referenced only here. Returns null (no readable image pipeline / bad
// image) instead of throwing.
async function toImageData(bytes: Uint8Array): Promise<ImageData | null> {
  if (typeof createImageBitmap !== "function") return null;

  // TEMPORARY perf-investigation instrumentation (gallery-scan speed
  // investigation, PERF task plan) — QR recovery's per-variant cost didn't
  // drop after switching to JPEG (still 18-52s/image), so the cost must be
  // here: bitmap decode, canvas draw, or getImageData's GPU->CPU readback
  // (a well-known slow point on some WebViews). Remove once confirmed/fixed.
  const bitmapStart = perfNow();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
  } catch {
    return null;
  }
  const bitmapMs = perfNow() - bitmapStart;
  const { width, height } = bitmap;
  if (width === 0 || height === 0) return null;

  const target = makeCanvas(width, height);
  if (!target) return null;
  const drawStart = perfNow();
  target.ctx.drawImage(bitmap, 0, 0);
  const drawMs = perfNow() - drawStart;

  const getImageDataStart = perfNow();
  const image = target.ctx.getImageData(0, 0, width, height);
  const getImageDataMs = perfNow() - getImageDataStart;

  console.debug(
    `[perf-investigation] toImageData bytes=${bytes.length} width=${width} height=${height} bitmapMs=${Math.round(bitmapMs)} drawMs=${Math.round(drawMs)} getImageDataMs=${Math.round(getImageDataMs)}`,
  );

  return image;
}

export const imageDataQrDecoder: QrDecoder = {
  async decode(bytes: Uint8Array): Promise<string | null> {
    try {
      const image = await toImageData(bytes);
      if (!image) return null;
      const jsQrStart = perfNow();
      const result = jsQR(image.data, image.width, image.height)?.data ?? null;
      console.debug(`[perf-investigation] jsQR width=${image.width} height=${image.height} jsQrMs=${Math.round(perfNow() - jsQrStart)} found=${result !== null}`);
      return result;
    } catch {
      return null;
    }
  },
};
