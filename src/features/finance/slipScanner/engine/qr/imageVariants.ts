export interface ImageVariant {
  label: string;
  bytes: Uint8Array;
}

// Produces recovery variants of an image for a QR re-decode: rotations (photo
// taken sideways), brightness (dark slip), contrast (faded), and upscale (low
// resolution). Browser-only (canvas); yields nothing off-browser (jsdom) so the
// recovery orchestration degrades cleanly. Cropped-QR recovery isn't attempted
// here — the crop region is unknown.
export type ImageVariantGenerator = (bytes: Uint8Array) => AsyncIterable<ImageVariant>;

async function canvasToBytes(canvas: OffscreenCanvas): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}

export const browserImageVariants: ImageVariantGenerator = async function* (bytes) {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
  } catch {
    return;
  }

  const { width, height } = bitmap;

  // Rotations.
  for (const deg of [90, 180, 270]) {
    const swap = deg === 90 || deg === 270;
    const canvas = new OffscreenCanvas(swap ? height : width, swap ? width : height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2);
    yield { label: `rotate-${deg}`, bytes: await canvasToBytes(canvas) };
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
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    yield { label, bytes: await canvasToBytes(canvas) };
  }
};
