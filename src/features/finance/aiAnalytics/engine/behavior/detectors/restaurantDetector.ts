import { detectFlagHabit, recentWindowExpense, DEFAULT_LOW_SHARE_PERCENT } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BehaviorEngineContext, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function detectRestaurantHabit(context: BehaviorEngineContext): DetectedHabit | null {
  const flag = context.behaviorAnalysis.flags.find((f) => f.key === "eatingOut");
  if (!flag) return null;

  return detectFlagHabit(flag, recentWindowExpense(context.cashFlowAnalysis), "restaurant", {
    highSharePercent: DEFAULT_SCORE_THRESHOLDS.behavior.discretionaryShareFullPenaltyPercent,
    lowSharePercent: DEFAULT_LOW_SHARE_PERCENT,
  });
}
