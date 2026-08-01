// Reads behaviorAnalysis.subscriptions (already a full recurring-charge
// detector — interval + amount consistency) — this only classifies the
// habit, it doesn't rediscover which charges are subscriptions.

import { confidenceForCount } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BehaviorEngineContext, DetectedHabit, HabitPolarity } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function detectSubscriptionHabit(context: BehaviorEngineContext): DetectedHabit | null {
  const { subscriptions } = context.behaviorAnalysis;
  if (subscriptions.length === 0) return null;

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.averageAmount, 0);
  const { income } = context.cashFlowAnalysis;
  const sharePercent = income > 0 ? (totalMonthly / income) * 100 : totalMonthly > 0 ? 100 : 0;
  const highThreshold = DEFAULT_SCORE_THRESHOLDS.behavior.subscriptionShareFullPenaltyPercent;

  const polarity: HabitPolarity = sharePercent >= highThreshold ? "negative" : sharePercent > 0 && sharePercent < highThreshold / 4 ? "positive" : "neutral";
  const params = { count: subscriptions.length, amount: Math.round(totalMonthly), percent: Math.round(sharePercent) };

  return {
    id: "subscription",
    polarity,
    confidence: confidenceForCount(subscriptions.length),
    message: { key: `aiAnalytics.behaviorProfile.detectors.subscription.${polarity}`, params },
    supportingMetrics: params,
  };
}
