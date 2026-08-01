// Financial Overview — financialSnapshot is already the single richest
// "headline numbers" object (Prompt 004), zero new computation.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.financialOverview";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondFinancialOverview(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const snapshot = data.financialSnapshot;
  const hasData = snapshot.transactionCount > 0;

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { income: Math.round(snapshot.income), expense: Math.round(snapshot.expense), savings: Math.round(snapshot.savings), currentBalance: Math.round(snapshot.currentBalance) } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage = hasData
    ? { key: `${NS}.reason`, params: { savingRatePercent: snapshot.savingRatePercent !== null ? Math.round(snapshot.savingRatePercent) : 0 } }
    : { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = {
    income: snapshot.income,
    expense: snapshot.expense,
    savings: snapshot.savings,
    netCashFlow: snapshot.netCashFlow,
    currentBalance: snapshot.currentBalance,
  };
  if (snapshot.savingRatePercent !== null) supportingMetrics.savingRatePercent = snapshot.savingRatePercent;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
