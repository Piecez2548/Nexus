// Goal Progress — present-tense state (goalProgress), paired with
// forecastProfile.details.goalForecast's own expectedCompletionDate/
// probabilityOfCompletion for "when will I reach it" — the richer,
// purpose-built source for that specific phrasing, not re-derived here.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.goalProgress";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondGoalProgress(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { goalProgress, forecastProfile } = data;
  const incomplete = goalProgress.filter((g) => !g.isComplete);
  const nearest = incomplete[0] ?? null;
  const forecastEntry = nearest ? (forecastProfile.details.goalForecast.find((g) => g.goal.name === nearest.goal.name) ?? null) : null;

  const answer: CoachMessage = nearest
    ? { key: `${NS}.hasData`, params: { goalName: nearest.goal.name, progressPercent: Math.round(nearest.progressPercent) } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage = forecastEntry?.expectedCompletionDate
    ? { key: `${NS}.reasonWithForecast`, params: { expectedCompletionDate: forecastEntry.expectedCompletionDate } }
    : nearest
      ? { key: `${NS}.reasonNoForecast`, params: {} }
      : { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = nearest ? { progressPercent: nearest.progressPercent } : {};
  if (forecastEntry?.expectedCompletionDate) supportingMetrics.expectedCompletionDate = forecastEntry.expectedCompletionDate;
  if (forecastEntry?.probabilityOfCompletion !== null && forecastEntry?.probabilityOfCompletion !== undefined) supportingMetrics.probabilityOfCompletion = forecastEntry.probabilityOfCompletion;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData: nearest !== null, insufficientData: !forecastEntry?.paceKnown }),
    relatedRecommendations: data.actionableRecommendations.filter((r) => r.category === "goals").slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
