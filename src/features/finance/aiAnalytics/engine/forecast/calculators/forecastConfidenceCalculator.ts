// Numeric 0-100 confidence for every forecast in this engine — mirrors the
// named-constant, clamped shape of engine/recommendation/calculators/
// confidenceCalculator.ts, but built from forecast-relevant inputs:
// months of history, trend/cash-flow stability, and the Prompt 005 scoring
// engine's own insufficientData judgment. Seasonality (per the spec's own
// "based on... seasonality" note) is out of scope — no year-over-year data
// exists yet (same deferral as Category Trend's year-over-year field).

import { clamp } from "@/features/finance/aiAnalytics/engine/forecast/calculators/mathUtils";

const BASE_CONFIDENCE = 50;

const HISTORY_BASELINE_MONTHS = 3;
const HISTORY_ADJUSTMENT_PER_MONTH = 5;
const MAX_HISTORY_ADJUSTMENT = 20;

// Scaled around a neutral stabilityScore of 50 — above it nudges
// confidence up, below it nudges down, capped at +/-15.
const STABILITY_MIDPOINT = 50;
const STABILITY_WEIGHT = 0.3;
const NO_STABILITY_SIGNAL_PENALTY = 10;

const INSUFFICIENT_DATA_PENALTY = 20;

export function calculateForecastConfidence(monthsOfHistory: number, stabilityScore: number | null, insufficientData: boolean): number {
  const historyAdjustment = clamp((monthsOfHistory - HISTORY_BASELINE_MONTHS) * HISTORY_ADJUSTMENT_PER_MONTH, -MAX_HISTORY_ADJUSTMENT, MAX_HISTORY_ADJUSTMENT);
  const stabilityAdjustment = stabilityScore === null ? -NO_STABILITY_SIGNAL_PENALTY : (stabilityScore - STABILITY_MIDPOINT) * STABILITY_WEIGHT;
  const insufficientDataAdjustment = insufficientData ? -INSUFFICIENT_DATA_PENALTY : 0;

  return clamp(Math.round(BASE_CONFIDENCE + historyAdjustment + stabilityAdjustment + insufficientDataAdjustment), 0, 100);
}
