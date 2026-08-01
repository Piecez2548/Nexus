// Forecast — forecastProfile.summary/.details/.trendAnalysis already cover
// nearly every forward-looking sub-question (budget risk, spending trend),
// zero new computation. This is the ONLY responder that answers "will I
// exceed my budget" (via details.budgetForecast.categoriesLikelyToExceed,
// which itself already excludes present-tense already-over budgets) and
// "what is my spending trend" (via trendAnalysis.category).

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.forecast";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondForecast(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { forecastProfile } = data;
  const { summary, details, trendAnalysis, supportingMetrics: forecastSupportingMetrics } = forecastProfile;
  const hasData = !forecastSupportingMetrics.insufficientData;
  const atRiskCategories = details.budgetForecast.categoriesLikelyToExceed;

  const answer: CoachMessage = hasData
    ? {
        key: `${NS}.hasData`,
        params: { expectedEndOfMonthBalance: summary.expectedEndOfMonthBalance !== null ? Math.round(summary.expectedEndOfMonthBalance) : 0, expectedSavings: Math.round(summary.expectedSavings) },
      }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage =
    atRiskCategories.length > 0
      ? { key: `${NS}.reasonBudgetRisk`, params: { category: atRiskCategories[0], count: atRiskCategories.length } }
      : trendAnalysis.category.fastestGrowingCategory
        ? { key: `${NS}.reasonTrend`, params: { category: trendAnalysis.category.fastestGrowingCategory } }
        : { key: `${NS}.reasonStable`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasData ? { expectedSavings: summary.expectedSavings, forecastConfidence: summary.overallConfidence } : {};
  if (summary.expectedEndOfMonthBalance !== null) supportingMetrics.expectedEndOfMonthBalance = summary.expectedEndOfMonthBalance;
  if (atRiskCategories.length > 0) supportingMetrics.categoriesAtRisk = atRiskCategories.join(", ");

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData, insufficientData: forecastSupportingMetrics.insufficientData }),
    relatedRecommendations: data.actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
