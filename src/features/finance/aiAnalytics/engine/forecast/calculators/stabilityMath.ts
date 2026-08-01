// General-purpose extraction of Prompt 007's behaviorScoreCalculator.ts
// scoreConsistency() coefficient-of-variation math (itself mirroring
// Prompt 005's cashFlowScore.ts stability calculation) — kept local to
// this engine rather than imported cross-engine, so engine/forecast stays
// self-contained the same way engine/behavior's own scoreMath.ts is.

import { clamp } from "@/features/finance/aiAnalytics/engine/forecast/calculators/mathUtils";

// 0-100 stability score from a coefficient-of-variation on `values` — low
// variation relative to the mean scores high. Null (never a fabricated
// number) when fewer than 2 values are actually active (>0), since
// variation is meaningless with 0-1 data points.
export function coefficientOfVariationScore(values: number[], maxCoV: number): number | null {
  const activeCount = values.filter((v) => v > 0).length;
  if (activeCount < 2) return null;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean <= 0) return null;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  return clamp(100 - (coefficientOfVariation / maxCoV) * 100, 0, 100);
}

// Same shape, but for series that can legitimately go negative (net cash
// flow, not spending) — "active" isn't v>0 here (a negative month is still
// real data), and the coefficient uses |mean| exactly like Prompt 005's
// cashFlowScore.ts does, since a plain (possibly negative or near-zero)
// mean would make the ratio meaningless or sign-flipped. Null only when
// every value is exactly 0 (a brand-new profile with no activity at all —
// same guard cashFlowScore.ts uses).
export function signedCoefficientOfVariationScore(values: number[], maxCoV: number): number | null {
  if (values.length < 2 || values.every((v) => v === 0)) return null;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const absMean = Math.abs(mean);
  const coefficientOfVariation = absMean > 0 ? Math.sqrt(variance) / absMean : variance > 0 ? 1 : 0;
  return clamp(100 - (coefficientOfVariation / maxCoV) * 100, 0, 100);
}
