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

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export async function preprocessForOcr(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof createImageBitmap !== "function") return bytes;

  const totalStart = perfNow();
  try {
    const enhanceStart = perfNow();
    const { bytes: corrected, applied } = await enhanceIfNeeded(bytes);
    const enhanceMs = perfNow() - enhanceStart;

    // TEMPORARY perf-investigation instrumentation (OCR bottleneck
    // investigation) -- decodes `corrected` at (still uncapped) resolution
    // before any downscale happens below; when enhanceIfNeeded applied a
    // correction, `corrected` is itself a full-resolution PNG it just
    // encoded, so this is a THIRD full-resolution decode of the same photo
    // in the worst case (analyzeImage's, enhanceIfNeeded's, this one).
    // Remove once confirmed/fixed.
    const decodeStart = perfNow();
    const bitmap = await createImageBitmap(new Blob([corrected as unknown as BlobPart]));
    const decodeMs = perfNow() - decodeStart;

    // Scale toward ~1200px on the short edge (helps Tesseract on small digits,
    // and bounds memory/CPU on a full-resolution gallery photo); capped at 2×
    // upscale for tiny images, but free to downscale large ones.
    const scale = Math.min(MAX_UPSCALE, TARGET_SHORT_EDGE / Math.max(1, Math.min(bitmap.width, bitmap.height)));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const target = makeCanvas(width, height);
    if (!target) return bytes;
    const drawStart = perfNow();
    target.ctx.drawImage(bitmap, 0, 0, width, height);
    const drawMs = perfNow() - drawStart;

    const grayStart = perfNow();
    const image = target.ctx.getImageData(0, 0, width, height);
    const gray = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      gray[p] = Math.round(luma(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!));
    }
    const grayMs = perfNow() - grayStart;

    const otsuStart = perfNow();
    const threshold = otsuThreshold(gray);
    const otsuMs = perfNow() - otsuStart;

    // Binarise (value > threshold → white bg, else black text) and write back
    // in a single pass, rather than a separate threshold loop then a copy loop.
    const binarizeStart = perfNow();
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      const v = gray[p]! > threshold ? 255 : 0;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    target.ctx.putImageData(image, 0, 0);
    const binarizeMs = perfNow() - binarizeStart;

    const encodeStart = perfNow();
    const result = await canvasToBytes(target.canvas);
    const encodeMs = perfNow() - encodeStart;

    console.debug(
      `[perf-investigation] preprocessForOcr inputBytes=${bytes.length} enhanceApplied=${applied !== null} enhanceMs=${Math.round(enhanceMs)} decodeMs=${Math.round(decodeMs)} outWidth=${width} outHeight=${height} drawMs=${Math.round(drawMs)} grayMs=${Math.round(grayMs)} otsuMs=${Math.round(otsuMs)} binarizeMs=${Math.round(binarizeMs)} encodeMs=${Math.round(encodeMs)} outputBytes=${result.length} totalMs=${Math.round(perfNow() - totalStart)}`,
    );

    return result;
  } catch {
    return bytes;
  }
}
