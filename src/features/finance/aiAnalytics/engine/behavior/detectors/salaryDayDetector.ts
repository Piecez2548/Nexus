// Reads the Rule Engine's own output rather than reimplementing
// salary-proximity detection — largeSpendingAfterSalary.rule.ts (Prompt 003)
// already does exactly that.

import type { RecommendationConfidence } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { BehaviorEngineContext, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

// Same 35/60/85 tiering as flagBasedDetector.ts's confidenceForCount, keyed
// by the rule's own confidence tier instead of a raw count (a
// Recommendation carries no natural sample-size number to count from).
const CONFIDENCE_TIER_VALUE: Record<RecommendationConfidence, number> = { high: 85, medium: 60, low: 35 };

export function detectSalaryDayHabit(context: BehaviorEngineContext): DetectedHabit | null {
  const rec = context.recommendations.find((r) => r.key === "largeSpendingAfterSalary");
  if (!rec) return null;

  return {
    id: "salaryDay",
    // This rule only ever fires when a real post-salary spending spike was
    // found — there's no "salaryDay.positive" framing, only whether the
    // pattern was detected at all.
    polarity: "negative",
    confidence: CONFIDENCE_TIER_VALUE[rec.confidence],
    message: { key: "aiAnalytics.behaviorProfile.detectors.salaryDay.negative", params: rec.params },
    supportingMetrics: rec.params,
  };
}
