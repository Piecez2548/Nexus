// Recommendations — actionableRecommendations is already priority-sorted
// (prioritizeRecommendations.ts), so "which category should I reduce
// first" is a plain [0] lookup. Zero new logic.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.recommendations";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondRecommendations(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { actionableRecommendations } = data;
  const hasData = actionableRecommendations.length > 0;
  const top = actionableRecommendations[0] ?? null;

  const answer: CoachMessage = top
    ? { key: `${NS}.hasData`, params: { category: top.category, estimatedMonthlySavings: Math.round(top.estimatedMonthlySavings) } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage = top?.reason ?? { key: `${NS}.reasonNoData`, params: {} };

  return {
    answer,
    reason,
    supportingMetrics: top ? { category: top.category, estimatedMonthlySavings: top.estimatedMonthlySavings, estimatedAnnualSavings: top.estimatedAnnualSavings } : {},
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
