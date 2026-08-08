// Otsu's method: pick the grayscale threshold that best separates foreground
// (text) from background (watermark/paper) by maximising between-class variance.
// Pure and testable; used by the OCR preprocessing to binarise a slip so the
// teal watermark drops to white and text stays black.
export function otsuThreshold(gray: ArrayLike<number>): number {
  const histogram = new Array<number>(256).fill(0);
  const total = gray.length;
  if (total === 0) return 127;

  for (let i = 0; i < total; i++) {
    const value = Math.max(0, Math.min(255, Math.round(gray[i]!)));
    histogram[value] += 1;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t]!;

  let sumB = 0;
  let weightB = 0;
  let maxBetween = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    weightB += histogram[t]!;
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += t * histogram[t]!;
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const between = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (between > maxBetween) {
      maxBetween = between;
      threshold = t;
    }
  }

  return threshold;
}

// Binarise a grayscale buffer in place using a threshold: value > threshold →
// 255 (white background), else 0 (black text). Uses `>` so that pixels equal to
// the Otsu threshold (the top of the dark/foreground class) stay black. Returns
// the same buffer.
export function binarize(gray: Uint8Array, threshold: number): Uint8Array {
  for (let i = 0; i < gray.length; i++) gray[i] = gray[i]! > threshold ? 255 : 0;
  return gray;
}
