import { canvasToBytes, luma, makeCanvas } from "@/features/finance/slipScanner/engine/image/canvas";
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

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Measure mean brightness + contrast (luma std) from a downscaled copy. Browser
// only (via the shared OffscreenCanvas/DOM-canvas fallback); null off-browser.
export async function analyzeImage(bytes: Uint8Array): Promise<ImageStats | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    // TEMPORARY perf-investigation instrumentation (OCR bottleneck investigation)
    // -- this decodes the ORIGINAL, full-resolution bytes just to read a 64x64
    // downscaled sample; suspected to be a real cost on a 12+ megapixel gallery
    // photo, same class of bug Fix 1 found in the QR path. Remove once confirmed.
    const decodeStart = perfNow();
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const decodeMs = perfNow() - decodeStart;
    const target = makeCanvas(64, 64);
    if (!target) return null;
    const ctx = target.ctx;
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);

    let sum = 0;
    const lumas: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const l = luma(data[i]!, data[i + 1]!, data[i + 2]!);
      lumas.push(l);
      sum += l;
    }
    const brightness = sum / lumas.length;
    const variance = lumas.reduce((acc, l) => acc + (l - brightness) ** 2, 0) / lumas.length;
    console.debug(
      `[perf-investigation] analyzeImage inputBytes=${bytes.length} bitmapWidth=${bitmap.width} bitmapHeight=${bitmap.height} decodeMs=${Math.round(decodeMs)}`,
    );
    return { brightness, contrast: Math.sqrt(variance) };
  } catch {
    return null;
  }
}

function sharpen(
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
    console.debug(`[perf-investigation] enhanceIfNeeded applied=false brightness=${stats.brightness.toFixed(1)} contrast=${stats.contrast.toFixed(1)}`);
    return { bytes, applied: null };
  }

  try {
    // TEMPORARY perf-investigation instrumentation (OCR bottleneck
    // investigation) -- a SECOND full-resolution decode of the same bytes
    // analyzeImage() already decoded, plus a full-resolution canvasToBytes
    // encode below (the same PNG-encode operation the QR investigation
    // measured at ~4-7s/call regardless of resolution). Remove once confirmed.
    const decodeStart = perfNow();
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const decodeMs = perfNow() - decodeStart;
    const target = makeCanvas(bitmap.width, bitmap.height);
    if (!target) return { bytes, applied: null };
    const ctx = target.ctx;

    const drawStart = perfNow();
    ctx.filter = enhancementFilterString(plan);
    ctx.drawImage(bitmap, 0, 0);
    const drawMs = perfNow() - drawStart;

    let sharpenMs = 0;
    if (plan.sharpen) {
      const sharpenStart = perfNow();
      ctx.filter = "none";
      sharpen(ctx, bitmap.width, bitmap.height);
      sharpenMs = perfNow() - sharpenStart;
    }

    const encodeStart = perfNow();
    const encoded = await canvasToBytes(target.canvas);
    const encodeMs = perfNow() - encodeStart;
    console.debug(
      `[perf-investigation] enhanceIfNeeded applied=true width=${bitmap.width} height=${bitmap.height} decodeMs=${Math.round(decodeMs)} drawMs=${Math.round(drawMs)} sharpen=${plan.sharpen} sharpenMs=${Math.round(sharpenMs)} encodeMs=${Math.round(encodeMs)} outputBytes=${encoded.length}`,
    );

    return { bytes: encoded, applied: plan };
  } catch {
    return { bytes, applied: null };
  }
}
