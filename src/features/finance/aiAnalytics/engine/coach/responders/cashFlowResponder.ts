// Cash Flow — cashFlowAnalysis is the purpose-built field for this exact
// intent, zero new computation.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.cashFlow";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondCashFlow(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { cashFlowAnalysis } = data;
  const hasData = cashFlowAnalysis.income > 0 || cashFlowAnalysis.expense > 0;
  const activeMonths = cashFlowAnalysis.monthlyTrend.filter((m) => m.income !== 0 || m.expense !== 0).length;

  const answer: CoachMessage = hasData
    ? { key: `${NS}.hasData`, params: { netCashFlow: Math.round(cashFlowAnalysis.netCashFlow), income: Math.round(cashFlowAnalysis.income), expense: Math.round(cashFlowAnalysis.expense) } }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage =
    cashFlowAnalysis.netCashFlow >= 0
      ? { key: `${NS}.reasonPositive`, params: {} }
      : { key: `${NS}.reasonNegative`, params: { shortfall: Math.round(Math.abs(cashFlowAnalysis.netCashFlow)) } };

  return {
    answer,
    reason,
    supportingMetrics: hasData ? { netCashFlow: cashFlowAnalysis.netCashFlow, income: cashFlowAnalysis.income, expense: cashFlowAnalysis.expense } : {},
    confidence: computeAnswerConfidence({ hasData, sampleSize: activeMonths }),
    relatedRecommendations: data.actionableRecommendations.filter((r) => r.category === "cashFlow").slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
