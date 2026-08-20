import jsQR from "jsqr";

import { makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import { capLongEdge, MAX_QR_DECODE_LONG_EDGE, shouldResizeOnDecode } from "@/features/finance/slipScanner/engine/qr/qrDecodeResize";

// Decode image bytes to pixels for jsQR, via the shared OffscreenCanvas/DOM
// <canvas> fallback (some Android WebViews don't expose OffscreenCanvas, which
// silently broke on-device QR decoding — everything fell through to OCR). jsQR
// is referenced only here. Returns null (no readable image pipeline / bad
// image) instead of throwing.
async function toImageData(bytes: Uint8Array): Promise<ImageData | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    const blob = new Blob([bytes as unknown as BlobPart]);
    // resizeHeight alone (not resizeWidth too) lets the decoder compute the
    // other axis itself, preserving the source's real aspect ratio and EXIF
    // orientation exactly -- specifying both axes ourselves would risk
    // distorting a landscape photo, since we don't know its natural
    // dimensions ahead of a decode we're specifically trying to avoid doing
    // at full resolution. This only bounds height; capLongEdge below
    // corrects width for a landscape source.
    bitmap = shouldResizeOnDecode(bytes.length)
      ? await createImageBitmap(blob, { resizeHeight: MAX_QR_DECODE_LONG_EDGE, resizeQuality: "medium" })
      : await createImageBitmap(blob);
  } catch {
    return null;
  }
  if (bitmap.width === 0 || bitmap.height === 0) return null;

  const { width, height } = capLongEdge(bitmap.width, bitmap.height);

  const target = makeCanvas(width, height);
  if (!target) return null;
  target.ctx.drawImage(bitmap, 0, 0, width, height);

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

// Decode a QR straight from pixels already in hand (used by QR recovery,
// imageVariants.ts) instead of encoding the canvas to bytes and decoding it
// straight back -- real-device measurement found that round trip's encode
// step (canvas convertToBlob/toBlob) alone cost ~4-7s *per variant* on this
// device regardless of format (PNG or JPEG) or resolution, while everything
// else (bitmap decode, draw, getImageData, jsQR) stayed in the tens-to-low-
// hundreds of ms. Six variants of that meant ~25-40s of pure, unnecessary
// encoding per non-slip photo. Synchronous since jsQR itself is synchronous.
export function decodeImageDataQr(image: ImageData): string | null {
  try {
    return jsQR(image.data, image.width, image.height)?.data ?? null;
  } catch {
    return null;
  }
}
