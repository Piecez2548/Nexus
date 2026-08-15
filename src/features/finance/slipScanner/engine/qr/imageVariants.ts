function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export interface ImageVariant {
  label: string;
  imageData: ImageData;
}

// Produces recovery variants of an image for a QR re-decode: rotations (photo
// taken sideways), brightness (dark slip), contrast (faded), and upscale (low
// resolution). Browser-only (canvas); yields nothing off-browser (jsdom) so the
// recovery orchestration degrades cleanly. Cropped-QR recovery isn't attempted
// here — the crop region is unknown.
export type ImageVariantGenerator = (bytes: Uint8Array) => AsyncIterable<ImageVariant>;

// Recovery runs on every image the initial full-resolution decode already
// failed on — which, for a real gallery, is nearly every photo (only a small
// fraction are slips). Capping the working size once, up front, keeps every
// variant bounded without touching the initial full-resolution attempt that
// successfully reads most real slip QR codes on the first try. 1600px mirrors
// the same order of magnitude already proven sufficient for reading (finer-
// grained) Thai slip text in ocrPreprocess.ts's 1200px short-edge target — QR
// modules are coarser than glyph strokes, so this is generous.
const MAX_LONG_EDGE = 1600;

export const browserImageVariants: ImageVariantGenerator = async function* (bytes) {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
  } catch {
    return;
  }

  let base: CanvasImageSource = bitmap;
  let width = bitmap.width;
  let height = bitmap.height;
  const longEdge = Math.max(width, height);
  if (longEdge > MAX_LONG_EDGE) {
    const downscale = MAX_LONG_EDGE / longEdge;
    width = Math.round(width * downscale);
    height = Math.round(height * downscale);
    const baseCanvas = new OffscreenCanvas(width, height);
    const baseCtx = baseCanvas.getContext("2d");
    if (baseCtx) {
      baseCtx.drawImage(bitmap, 0, 0, width, height);
      base = baseCanvas;
    } else {
      width = bitmap.width;
      height = bitmap.height;
    }
  }

  // Rotations.
  for (const deg of [90, 180, 270]) {
    const swap = deg === 90 || deg === 270;
    const canvas = new OffscreenCanvas(swap ? height : width, swap ? width : height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const drawStart = perfNow();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(base, -width / 2, -height / 2);
    const drawMs = perfNow() - drawStart;
    // TEMPORARY perf-investigation instrumentation (gallery-scan speed
    // investigation, PERF task plan) — confirms the fix: real-device data
    // showed canvasToBytes's encode step alone cost ~4-7s/variant regardless
    // of format, so variants now read pixels straight off the canvas
    // (getImageData) instead of encoding to bytes and immediately decoding
    // them back. Remove once confirmed on-device.
    const readStart = perfNow();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const getImageDataMs = perfNow() - readStart;
    console.debug(
      `[perf-investigation] variant label=rotate-${deg} width=${canvas.width} height=${canvas.height} drawMs=${Math.round(drawMs)} getImageDataMs=${Math.round(getImageDataMs)}`,
    );
    yield { label: `rotate-${deg}`, imageData };
  }

  // Filtered variants (brightness / contrast) and an upscale.
  const filters: Array<{ label: string; filter: string; scale: number }> = [
    { label: "brighten", filter: "brightness(1.6)", scale: 1 },
    { label: "contrast", filter: "contrast(1.5)", scale: 1 },
    { label: "upscale", filter: "none", scale: 2 },
  ];
  for (const { label, filter, scale } of filters) {
    const canvas = new OffscreenCanvas(width * scale, height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.filter = filter;
    const drawStart = perfNow();
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    const drawMs = perfNow() - drawStart;
    const readStart = perfNow();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const getImageDataMs = perfNow() - readStart;
    console.debug(
      `[perf-investigation] variant label=${label} width=${canvas.width} height=${canvas.height} drawMs=${Math.round(drawMs)} getImageDataMs=${Math.round(getImageDataMs)}`,
    );
    yield { label, imageData };
  }
};
