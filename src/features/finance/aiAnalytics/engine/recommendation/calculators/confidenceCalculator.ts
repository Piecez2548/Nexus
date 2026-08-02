// Numeric 0-100 confidence, built from:
// - Rule strength: the rule's own 3-tier confidence (already
//   sample-size/severity-driven per rule, see engine/rules/shared.ts's
//   confidenceForSampleSize()) as a base, plus a small nudge for how urgent
//   the underlying priority tier is.
// - Data quality: months of history available (reuses
//   healthScore.ts's computeMonthsOfHistory, already computed once in
//   localStatisticalEngine.ts), plus a further penalty when the Prompt 005
//   scoring engine itself judged the whole profile data-insufficient
//   (financialHealthScore.insufficientData) — a second, independent
//   data-quality signal, not a duplicate of the months-of-history one.
// "information"-priority recommendations (the celebratory rules) are flat
// 95 — these are factual statements about what already happened ("you
// saved 20% this month"), not predictions, so the usual uncertainty
// treatment doesn't apply to them.

import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import type { Recommendation, RecommendationConfidence, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

const BASE_CONFIDENCE: Record<RecommendationConfidence, number> = { high: 85, medium: 60, low: 35 };
const PRIORITY_ADJUSTMENT: Partial<Record<RecommendationPriority, number>> = { critical: 5, low: -5 };
const INFORMATION_CONFIDENCE = 95;

const HISTORY_BASELINE_MONTHS = 3;
const HISTORY_ADJUSTMENT_PER_MONTH = 2;
const MAX_HISTORY_ADJUSTMENT = 10;
const INSUFFICIENT_DATA_PENALTY = 10;

export function calculateConfidence(rec: Recommendation, monthsOfHistory: number, insufficientData: boolean): number {
  if (rec.priority === "information") return INFORMATION_CONFIDENCE;

  const base = BASE_CONFIDENCE[rec.confidence];
  const priorityAdjustment = PRIORITY_ADJUSTMENT[rec.priority] ?? 0;
  const historyAdjustment = clamp((monthsOfHistory - HISTORY_BASELINE_MONTHS) * HISTORY_ADJUSTMENT_PER_MONTH, -MAX_HISTORY_ADJUSTMENT, MAX_HISTORY_ADJUSTMENT);
  const insufficientDataAdjustment = insufficientData ? -INSUFFICIENT_DATA_PENALTY : 0;

  return clamp(Math.round(base + priorityAdjustment + historyAdjustment + insufficientDataAdjustment), 0, 100);
}
