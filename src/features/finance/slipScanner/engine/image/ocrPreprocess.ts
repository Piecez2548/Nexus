import { canvasToBytes, luma, makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import { enhanceIfNeeded } from "@/features/finance/slipScanner/engine/image/imageEnhancer";
import { otsuThreshold } from "@/features/finance/slipScanner/engine/image/otsu";

// OCR preprocessing (OCR tuning): correct brightness/contrast only when the
// image actually needs it (GS-027's "only process when necessary" rule, via
// enhanceIfNeeded — this also gives Otsu a real signal on an overexposed/
// near-uniform slip that would otherwise degenerate to its default threshold
// and wipe the text to blank), then upscale/downscale toward a target size and
// binarise (grayscale → Otsu threshold → black/white) so watermarks/coloured
// backgrounds drop out and text is crisp for Tesseract. Browser-only; returns
// the original bytes off-browser or on any failure, so it never blocks OCR.

const TARGET_SHORT_EDGE = 1200;
const MAX_UPSCALE = 2;

export async function preprocessForOcr(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof createImageBitmap !== "function") return bytes;

  try {
    const { bytes: corrected } = await enhanceIfNeeded(bytes);
    const bitmap = await createImageBitmap(new Blob([corrected as unknown as BlobPart]));
    // Scale toward ~1200px on the short edge (helps Tesseract on small digits,
    // and bounds memory/CPU on a full-resolution gallery photo); capped at 2×
    // upscale for tiny images, but free to downscale large ones.
    const scale = Math.min(MAX_UPSCALE, TARGET_SHORT_EDGE / Math.max(1, Math.min(bitmap.width, bitmap.height)));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const target = makeCanvas(width, height);
    if (!target) return bytes;
    target.ctx.drawImage(bitmap, 0, 0, width, height);

    const image = target.ctx.getImageData(0, 0, width, height);
    const gray = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      gray[p] = Math.round(luma(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!));
    }

    const threshold = otsuThreshold(gray);

    // Binarise and write back in the same pass (instead of a separate
    // binarize() loop over `gray` followed by a copy loop into `image.data`).
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      const v = gray[p]! > threshold ? 255 : 0;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    target.ctx.putImageData(image, 0, 0);

    return await canvasToBytes(target.canvas);
  } catch {
    return bytes;
  }
}
