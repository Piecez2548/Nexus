import { encodeBmp } from "@/features/finance/slipScanner/engine/image/bmpEncoder";
import { luma, makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import { analyzeImage, sharpen } from "@/features/finance/slipScanner/engine/image/imageEnhancer";
import { enhancementFilterString, isEnhancementNeeded, planEnhancements } from "@/features/finance/slipScanner/engine/image/imageEnhancement";
import { otsuThreshold } from "@/features/finance/slipScanner/engine/image/otsu";

// OCR preprocessing (OCR tuning): correct brightness/contrast only when the
// image actually needs it (GS-027's "only process when necessary" rule),
// then upscale/downscale toward a target size and binarise (grayscale ->
// Otsu threshold -> black/white) so watermarks/coloured backgrounds drop out
// and text is crisp for Tesseract. Browser-only; returns the original bytes
// off-browser or on any failure, so it never blocks OCR.
//
// The enhancement step (brightness/contrast/sharpen) is applied directly in
// this function's own canvas pipeline rather than by calling
// imageEnhancer.ts's enhanceIfNeeded() (still available standalone, just
// unused here) -- real-device measurement found that going through
// enhanceIfNeeded's own decode-filter-encode round trip, only to decode the
// resulting PNG straight back again here, cost ~5-7s/image on this device
// (the same class of PNG-encode cost the QR investigation identified) for
// zero pixel benefit over drawing canvas-to-canvas in memory. The filter and
// sharpen still apply at the same point in the pipeline (full resolution,
// before the resize below) as enhanceIfNeeded's own implementation, so the
// output is pixel-equivalent, not just visually similar.
//
// The final encode is BMP (bmpEncoder.ts), not PNG. Real-device testing
// found OffscreenCanvas.convertToBlob costs a fixed ~4.1s per call
// regardless of format (PNG and JPEG measured identically) or image
// size/content -- so switching formats via convertToBlob was a dead end,
// but Tesseract's own worker-side code accepts BMP directly (it round-trips
// any BMP input through the bmp-js package before handing it to Leptonica),
// and an uncompressed BMP's "encode" is just a header write plus a raw byte
// copy -- no convertToBlob call, and no compression pass to pay for.

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
    const stats = await analyzeImage(bytes);
    const plan = stats ? planEnhancements(stats) : null;
    const needsEnhancement = plan !== null && isEnhancementNeeded(plan);
    const enhanceMs = perfNow() - enhanceStart;

    const decodeStart = perfNow();
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
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
    if (needsEnhancement && plan) {
      // Apply brightness/contrast/sharpen at full resolution (matching
      // enhanceIfNeeded's own order exactly), on a full-size intermediate
      // canvas, then draw that -- not the original bitmap -- scaled onto the
      // target canvas. Canvas-to-canvas drawImage needs no encode/decode.
      const full = makeCanvas(bitmap.width, bitmap.height);
      if (!full) return bytes;
      full.ctx.filter = enhancementFilterString(plan);
      full.ctx.drawImage(bitmap, 0, 0);
      if (plan.sharpen) {
        full.ctx.filter = "none";
        sharpen(full.ctx, bitmap.width, bitmap.height);
      }
      target.ctx.drawImage(full.canvas, 0, 0, width, height);
    } else {
      target.ctx.drawImage(bitmap, 0, 0, width, height);
    }
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

    // Binarise (value > threshold → white bg, else black text) in place --
    // no need to write back to the canvas (target.canvas is never read from
    // again; encodeBmp below reads straight from this ImageData).
    const binarizeStart = perfNow();
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      const v = gray[p]! > threshold ? 255 : 0;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    const binarizeMs = perfNow() - binarizeStart;

    const encodeStart = perfNow();
    const result = encodeBmp(image);
    const encodeMs = perfNow() - encodeStart;

    console.debug(
      `[perf-investigation] preprocessForOcr inputBytes=${bytes.length} enhanceApplied=${needsEnhancement} enhanceMs=${Math.round(enhanceMs)} decodeMs=${Math.round(decodeMs)} outWidth=${width} outHeight=${height} drawMs=${Math.round(drawMs)} grayMs=${Math.round(grayMs)} otsuMs=${Math.round(otsuMs)} binarizeMs=${Math.round(binarizeMs)} encodeMs=${Math.round(encodeMs)} outputBytes=${result.length} totalMs=${Math.round(perfNow() - totalStart)}`,
    );

    return result;
  } catch {
    return bytes;
  }
}
