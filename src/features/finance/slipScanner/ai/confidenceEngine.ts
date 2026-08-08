// Confidence Engine (GS-046): combine the per-stage confidence signals — QR,
// OCR, parser, bank template, and AI validation — into one overall confidence
// score. Pure and deterministic. Refines the quick `basicConfidence` heuristic
// on SlipCandidate (GS-015); a full pipeline feeds all available signals here.
// Only the signals actually present are weighted (weights renormalise over
// them), so a QR-only or OCR-only slip still gets a fair score.

export interface ConfidenceInputs {
  qr?: number; // 0–1: QR present/valid
  parser?: number; // 0–1: EMVCo parse (CRC + fields)
  ocr?: number; // 0–1: average OCR field confidence
  aiValidation?: number; // 0–1: GS-041/GS-025 confidence
  bankTemplate?: number; // 0–1: bank identified
}

export interface OverallConfidence {
  score: number; // 0–100
  breakdown: Partial<Record<keyof ConfidenceInputs, number>>;
}

export const DEFAULT_CONFIDENCE_WEIGHTS: Record<keyof ConfidenceInputs, number> = {
  qr: 0.3,
  parser: 0.25,
  ocr: 0.2,
  aiValidation: 0.15,
  bankTemplate: 0.1,
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function combineConfidence(
  inputs: ConfidenceInputs,
  weights: Record<keyof ConfidenceInputs, number> = DEFAULT_CONFIDENCE_WEIGHTS,
): OverallConfidence {
  const breakdown: Partial<Record<keyof ConfidenceInputs, number>> = {};
  let weighted = 0;
  let totalWeight = 0;

  for (const key of Object.keys(weights) as Array<keyof ConfidenceInputs>) {
    const value = inputs[key];
    if (value !== undefined) {
      const v = clamp01(value);
      breakdown[key] = v;
      weighted += v * weights[key];
      totalWeight += weights[key];
    }
  }

  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
  return { score, breakdown };
}
