// Shared long-edge resize cap for the QR pipeline's image decode -- both the
// initial detect pass (imageDataDecoder.ts) and QR recovery's first bitmap
// (imageVariants.ts) go through this, so a full-resolution bitmap of a real
// 12+ megapixel gallery photo is never materialized just to search it for a
// QR code. QR modules are coarse compared to OCR glyph strokes
// (ocrPreprocess.ts targets ~1200px for finer text), so this loses no real
// detection capability -- QR recovery has run at this same cap since the
// prior perf round with no reported drop in QR reads, only in speed once the
// encode round-trip was separately removed. Reused here for the initial
// detect pass instead of picking a second, unvalidated number.
export const MAX_QR_DECODE_LONG_EDGE = 1600;

// createImageBitmap's resizeWidth/resizeHeight options do not clamp to the
// source's natural size -- requesting a size larger than the source enlarges
// it, and we can't cheaply learn the source's real dimensions before decode
// (that would require either a full decode, defeating the point, or parsing
// the container format's header ourselves, which risks disagreeing with the
// decoder's own EXIF-orientation handling). A source this small in *encoded*
// bytes can't plausibly hold a real photo whose long edge exceeds the cap
// above under any realistic JPEG/PNG compression, so below this floor the
// decode-time resize hint is skipped entirely and the image decodes at its
// natural (small, so inherently cheap) size instead.
const MIN_BYTES_FOR_RESIZE_HINT = 150_000;

export function shouldResizeOnDecode(byteLength: number): boolean {
  return byteLength >= MIN_BYTES_FOR_RESIZE_HINT;
}

// Corrects the axis a single-axis decode-time resize (resizeHeight only --
// see the two call sites) can't bound: a landscape source has width, not
// height, as its long edge, so capping height alone can still leave width
// over the cap. Pure and cheap -- callers apply it to an already-small
// intermediate bitmap, not the original, so this never re-introduces a
// full-resolution decode. A no-op (returns the input unchanged) whenever the
// long edge is already within the cap, so it never upscales.
export function capLongEdge(width: number, height: number, maxLongEdge: number = MAX_QR_DECODE_LONG_EDGE): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longEdge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
