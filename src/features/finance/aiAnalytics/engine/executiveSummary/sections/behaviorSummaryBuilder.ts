// Almost entirely pass-through of Prompt 007's own output —
// behaviorProfile.insights already covers restaurant/coffee-trend,
// weekend-spending, and late-night signals (behaviorInsightGenerator.ts),
// so "Weekend spending" needs zero new computation here.

import type { BehaviorAnalysisEngineResult } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { BehaviorSummary } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

const MAX_TOP_HABITS = 3;

function topByConfidence<T extends { confidence: number }>(habits: T[], max: number): T[] {
  return [...habits].sort((a, b) => b.confidence - a.confidence).slice(0, max);
}

export function buildBehaviorSummary(behaviorProfile: BehaviorAnalysisEngineResult): BehaviorSummary {
  return {
    spendingStyle: behaviorProfile.profile.spendingStyle,
    insights: behaviorProfile.insights,
    topPositiveHabits: topByConfidence(behaviorProfile.positiveHabits, MAX_TOP_HABITS),
    topNegativeHabits: topByConfidence(behaviorProfile.negativeHabits, MAX_TOP_HABITS),
    confidence: behaviorProfile.confidence,
  };
}
