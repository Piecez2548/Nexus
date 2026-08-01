// Budget Status — present-tense "where do I stand right now" (budgetAnalysis).
// Deliberately does NOT read forecastProfile.details.budgetForecast — that
// forward-looking risk lives in the separate Forecast intent, since
// budgetForecast explicitly excludes already-over budgets (a present-tense
// fact, not a forecast) per its own source comment.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.budgetStatus";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondBudgetStatus(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { budgetAnalysis } = data;
  const hasData = budgetAnalysis.entries.length > 0;
  const overEntries = budgetAnalysis.entries.filter((e) => e.status === "over");

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { okCount: budgetAnalysis.okCount, nearCount: budgetAnalysis.nearCount, overCount: budgetAnalysis.overCount, totalCount: budgetAnalysis.entries.length } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage =
    overEntries.length > 0
      ? { key: `${NS}.reasonOverBudget`, params: { category: overEntries[0].budget.category, spent: Math.round(overEntries[0].spent), amount: overEntries[0].budget.amount } }
      : hasData
        ? { key: `${NS}.reasonOnTrack`, params: {} }
        : { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasData
    ? { okCount: budgetAnalysis.okCount, nearCount: budgetAnalysis.nearCount, overCount: budgetAnalysis.overCount }
    : {};

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.filter((r) => r.category === "budget").slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
