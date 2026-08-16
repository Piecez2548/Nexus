import { capLongEdge, MAX_QR_DECODE_LONG_EDGE, shouldResizeOnDecode } from "@/features/finance/slipScanner/engine/qr/qrDecodeResize";

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
// fraction are slips). The working size is capped once, up front (shared with
// the initial detect pass via qrDecodeResize.ts), so every variant is bounded.
export const browserImageVariants: ImageVariantGenerator = async function* (bytes) {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return;

  let bitmap: ImageBitmap;
  try {
    const blob = new Blob([bytes as unknown as BlobPart]);
    // Resize during decode rather than after (see imageDataDecoder.ts for
    // the same reasoning) -- the real-device cost lived in materializing a
    // full-resolution bitmap at all, not in the canvas transforms below,
    // which real-device instrumentation already showed were cheap (tens of
    // ms) once the separate encode/decode round trip was eliminated.
    bitmap = shouldResizeOnDecode(bytes.length)
      ? await createImageBitmap(blob, { resizeHeight: MAX_QR_DECODE_LONG_EDGE, resizeQuality: "medium" })
      : await createImageBitmap(blob);
  } catch {
    return;
  }

  let base: CanvasImageSource = bitmap;
  let width = bitmap.width;
  let height = bitmap.height;
  // The decode-time resize above only bounds height; a landscape source
  // (width the true long edge) can still exceed the cap -- correct it here,
  // on the now-small intermediate bitmap rather than the original.
  const capped = capLongEdge(width, height);
  if (capped.width !== width || capped.height !== height) {
    const baseCanvas = new OffscreenCanvas(capped.width, capped.height);
    const baseCtx = baseCanvas.getContext("2d");
    if (baseCtx) {
      baseCtx.drawImage(bitmap, 0, 0, capped.width, capped.height);
      base = baseCanvas;
      width = capped.width;
      height = capped.height;
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
