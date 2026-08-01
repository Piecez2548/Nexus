// Savings Progress — current-state (cashFlowAnalysis.saving/savingRatePercent
// + goalProgress, both present-tense). "When will I reach it" is a
// separate, forward-looking question answered by the Forecast/Goal
// Progress intents' own forecastProfile.details.goalForecast.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.savingsProgress";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondSavingsProgress(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { cashFlowAnalysis, goalProgress } = data;
  const hasData = cashFlowAnalysis.income > 0 || cashFlowAnalysis.expense > 0;
  const incompleteGoals = goalProgress.filter((g) => !g.isComplete);

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { saving: Math.round(cashFlowAnalysis.saving), savingRatePercent: cashFlowAnalysis.savingRatePercent !== null ? Math.round(cashFlowAnalysis.savingRatePercent) : 0 } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage =
    incompleteGoals.length > 0
      ? { key: `${NS}.reasonWithGoal`, params: { goalName: incompleteGoals[0].goal.name, progressPercent: Math.round(incompleteGoals[0].progressPercent) } }
      : { key: `${NS}.reasonNoGoal`, params: {} };

  const supportingMetrics: Record<string, string | number> = hasData ? { saving: cashFlowAnalysis.saving } : {};
  if (cashFlowAnalysis.savingRatePercent !== null) supportingMetrics.savingRatePercent = cashFlowAnalysis.savingRatePercent;
  if (incompleteGoals.length > 0) supportingMetrics.incompleteGoalCount = incompleteGoals.length;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.filter((r) => r.category === "saving").slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
