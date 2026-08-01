// Reads behaviorAnalysis.impulsePurchases directly — a distinct signal
// from the flag-based detectors (two reasons: aboveAverageNoBudget,
// multipleSameDay), not a share-of-a-single-category threshold.

import { recentWindowExpense, confidenceForCount } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import type { BehaviorEngineContext, DetectedHabit, HabitPolarity } from "@/features/finance/aiAnalytics/engine/behavior/types";

const IMPULSE_COUNT_THRESHOLD = 3;
const IMPULSE_SHARE_THRESHOLD_PERCENT = 10;

export function detectImpulseHabit(context: BehaviorEngineContext): DetectedHabit | null {
  const { impulsePurchases } = context.behaviorAnalysis;
  if (impulsePurchases.length === 0) return null;

  const total = impulsePurchases.reduce((sum, p) => sum + p.amount, 0);
  const windowExpense = recentWindowExpense(context.cashFlowAnalysis);
  const sharePercent = windowExpense > 0 ? (total / windowExpense) * 100 : 0;

  // Having any impulse purchases is never framed as "positive" — there's
  // no virtue in a nonzero count, only degrees of "needs attention" vs
  // "not yet a real pattern".
  const polarity: HabitPolarity = impulsePurchases.length >= IMPULSE_COUNT_THRESHOLD || sharePercent >= IMPULSE_SHARE_THRESHOLD_PERCENT ? "negative" : "neutral";
  const params = { count: impulsePurchases.length, amount: Math.round(total), percent: Math.round(sharePercent) };

  return {
    id: "impulse",
    polarity,
    confidence: confidenceForCount(impulsePurchases.length),
    message: { key: `aiAnalytics.behaviorProfile.detectors.impulse.${polarity}`, params },
    supportingMetrics: params,
  };
}
