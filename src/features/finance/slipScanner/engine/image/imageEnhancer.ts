import {
  enhancementFilterString,
  isEnhancementNeeded,
  planEnhancements,
  type EnhancementPlan,
  type ImageStats,
} from "@/features/finance/slipScanner/engine/image/imageEnhancement";

export interface EnhancementResult {
  bytes: Uint8Array; // enhanced bytes, or the originals when no processing was needed / possible
  applied: EnhancementPlan | null;
}

// Measure mean brightness + contrast (luma std) from a downscaled copy. Browser
// only; null off-browser.
export async function analyzeImage(bytes: Uint8Array): Promise<ImageStats | null> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);

    let sum = 0;
    const lumas: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      lumas.push(luma);
      sum += luma;
    }
    const brightness = sum / lumas.length;
    const variance = lumas.reduce((acc, l) => acc + (l - brightness) ** 2, 0) / lumas.length;
    return { brightness, contrast: Math.sqrt(variance) };
  } catch {
    return null;
  }
}

function sharpen(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
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
  if (!isEnhancementNeeded(plan)) return { bytes, applied: null };

  try {
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { bytes, applied: null };

    ctx.filter = enhancementFilterString(plan);
    ctx.drawImage(bitmap, 0, 0);
    if (plan.sharpen) {
      ctx.filter = "none";
      sharpen(ctx, canvas.width, canvas.height);
    }

    const blob = await canvas.convertToBlob({ type: "image/png" });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), applied: plan };
  } catch {
    return { bytes, applied: null };
  }
}
