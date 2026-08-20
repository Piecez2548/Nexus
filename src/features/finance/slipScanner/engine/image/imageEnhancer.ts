import { canvasToBytes, luma, makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
import {
  enhancementFilterString,
  isEnhancementNeeded,
  planEnhancements,
  type EnhancementPlan,
  type ImageStats,
} from "@/features/finance/slipScanner/engine/image/imageEnhancement";
import { shouldResizeOnDecode } from "@/features/finance/slipScanner/engine/qr/qrDecodeResize";

export interface EnhancementResult {
  bytes: Uint8Array; // enhanced bytes, or the originals when no processing was needed / possible
  applied: EnhancementPlan | null;
}

// The stats sample is always drawn into this fixed square regardless of the
// source's aspect ratio (a coarse brightness/contrast bucket, not a
// visually-faithful thumbnail) -- so, unlike the QR path, there is no
// distortion concern in asking the decoder to resize directly to this size.
const STATS_SAMPLE_SIZE = 64;

// Measure mean brightness + contrast (luma std) from a downscaled copy. Browser
// only (via the shared OffscreenCanvas/DOM-canvas fallback); null off-browser.
export async function analyzeImage(bytes: Uint8Array): Promise<ImageStats | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const blob = new Blob([bytes as unknown as BlobPart]);
    // Decode straight to the sample size instead of full resolution -- the
    // real-device OCR investigation found this full-resolution decode cost
    // ~1s/image on average (up to several seconds on a large gallery photo)
    // just to read a 64x64 sample, the same class of waste Fix 1 fixed for
    // the QR path. Reuses that fix's byte-size floor (shouldResizeOnDecode)
    // so a genuinely small source is never upscaled.
    const bitmap = shouldResizeOnDecode(bytes.length)
      ? await createImageBitmap(blob, { resizeWidth: STATS_SAMPLE_SIZE, resizeHeight: STATS_SAMPLE_SIZE, resizeQuality: "medium" })
      : await createImageBitmap(blob);
    const target = makeCanvas(STATS_SAMPLE_SIZE, STATS_SAMPLE_SIZE);
    if (!target) return null;
    const ctx = target.ctx;
    ctx.drawImage(bitmap, 0, 0, STATS_SAMPLE_SIZE, STATS_SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, STATS_SAMPLE_SIZE, STATS_SAMPLE_SIZE);

    let sum = 0;
    const lumas: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const l = luma(data[i]!, data[i + 1]!, data[i + 2]!);
      lumas.push(l);
      sum += l;
    }
    const brightness = sum / lumas.length;
    const variance = lumas.reduce((acc, l) => acc + (l - brightness) ** 2, 0) / lumas.length;
    return { brightness, contrast: Math.sqrt(variance) };
  } catch {
    return null;
  }
}

// Exported so preprocessForOcr (ocrPreprocess.ts) can apply the same 3x3
// sharpen convolution as part of its own single canvas pipeline, instead of
// duplicating this loop or round-tripping through enhanceIfNeeded's
// standalone encode/decode.
export function sharpen(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            acc += src.data[(py * width + px) * 4 + c]! * kernel[k]!;
            k++;
          }
        }
        out.data[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, acc));
      }
      out.data[(y * width + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// Enhance an image only if its stats call for it (GS-027). Returns the original
// bytes untouched when nothing is needed or off-browser.
export async function enhanceIfNeeded(bytes: Uint8Array): Promise<EnhancementResult> {
  const stats = await analyzeImage(bytes);
  if (!stats) return { bytes, applied: null };

  const plan = planEnhancements(stats);
  if (!isEnhancementNeeded(plan)) {
    return { bytes, applied: null };
  }

  try {
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const target = makeCanvas(bitmap.width, bitmap.height);
    if (!target) return { bytes, applied: null };
    const ctx = target.ctx;

    ctx.filter = enhancementFilterString(plan);
    ctx.drawImage(bitmap, 0, 0);

    if (plan.sharpen) {
      ctx.filter = "none";
      sharpen(ctx, bitmap.width, bitmap.height);
    }

    const encoded = await canvasToBytes(target.canvas);

    return { bytes: encoded, applied: plan };
  } catch {
    return { bytes, applied: null };
  }
}
