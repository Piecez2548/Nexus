// Behavior Analysis — the umbrella intent over Prompt 007's entire
// behaviorProfile (intents 9-12/Merchant/Restaurant/Coffee/Shopping are
// sub-slices of this same object). Reuses behaviorProfile.confidence
// directly rather than recomputing a parallel figure — Prompt 007 already
// solved "how confident are we in this profile" (30 if insufficientData,
// 60 if no habits detected, else the mean of detected-habit confidences),
// and that judgment shouldn't be second-guessed here.

import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.behaviorAnalysis";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondBehaviorAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { behaviorProfile } = data;
  const hasHabits = behaviorProfile.detectedHabits.length > 0;
  const topPositive = behaviorProfile.positiveHabits[0] ?? null;
  const topNegative = behaviorProfile.negativeHabits[0] ?? null;

  const answer: CoachMessage = hasHabits
    ? { key: `${NS}.hasData`, params: { positiveCount: behaviorProfile.positiveHabits.length, negativeCount: behaviorProfile.negativeHabits.length } }
    : { key: `${NS}.noData`, params: {} };

  // A negative habit is more actionable to surface first than a positive
  // one — falls back to the top positive habit, then a neutral no-data
  // reason if neither exists.
  const reason: CoachMessage = topNegative?.message ?? topPositive?.message ?? { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasHabits
    ? { positiveCount: behaviorProfile.positiveHabits.length, negativeCount: behaviorProfile.negativeHabits.length }
    : {};
  if (behaviorProfile.scores.overall !== null) supportingMetrics.behaviorScore = Math.round(behaviorProfile.scores.overall);

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: behaviorProfile.confidence,
    relatedRecommendations: behaviorProfile.recommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
