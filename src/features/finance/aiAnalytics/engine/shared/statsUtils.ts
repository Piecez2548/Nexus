// Shared coefficient-of-variation scoring — originally built inside
// engine/forecast/ (mirroring engine/behavior/calculators/behaviorScoreCalculator.ts's
// scoreConsistency(), itself mirroring engine/scoring/calculators/cashFlowScore.ts's
// stability calculation) and deliberately kept local at the time "so
// engine/forecast stays self-contained". Promoted here once a second real
// engine (engine/behavior/) needed the exact same formula — moving it to a
// neutral shared home avoids one sub-engine depending on another's
// internals, which is what the original self-containment comment was
// actually protecting against.
//
// NOT a drop-in replacement for every coefficient-of-variation calculation
// in this app: engine/analyzers/healthScore.ts, engine/scoring/calculators/
// cashFlowScore.ts, and engine/scoring/calculators/incomeStabilityScore.ts
// each have their own guard-condition differences (e.g. no "at least 2
// active values" gate, or a different zero-mean fallback) that look
// deliberate rather than accidental drift — swapping those to call this
// would be a behavior change, not a refactor, so they were left alone.

import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";

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
