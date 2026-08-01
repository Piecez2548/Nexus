// Expense Analysis — spendingAnalysis.topCategories for "how much did I
// spend"/"largest expense" (financialSnapshot.largestExpense is the same
// value as transactionStatistics.largestTransaction, just re-exposed),
// zero new computation.

import { computeAnswerConfidence } from "@/features/finance/aiAnalytics/engine/coach/calculators/answerConfidenceCalculator";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CoachMessage, CoachResponse } from "@/features/finance/aiAnalytics/engine/coach/types";

const NS = "aiAnalytics.aiCoach.answers.expenseAnalysis";
const MAX_RELATED_RECOMMENDATIONS = 3;

export function respondExpenseAnalysis(data: FinancialAnalysisResult): Omit<CoachResponse, "intent" | "nextSuggestedQuestion"> {
  const { spendingAnalysis, cashFlowAnalysis, financialSnapshot } = data;
  const hasData = cashFlowAnalysis.expense > 0;
  const topCategory = spendingAnalysis.topCategories[0] ?? null;
  const largestExpense = financialSnapshot.largestExpense;

  const answer: CoachMessage = hasData
    ? {
        key: `${NS}.hasData`,
        params: { expense: Math.round(cashFlowAnalysis.expense), topCategory: topCategory?.category ?? "-", topCategoryAmount: topCategory ? Math.round(topCategory.amount) : 0 },
      }
    : { key: `${NS}.noData`, params: {} };

  const reason: CoachMessage = largestExpense
    ? { key: `${NS}.reason`, params: { title: largestExpense.title, amount: Math.round(largestExpense.amount), date: largestExpense.date } }
    : { key: `${NS}.reasonNoData`, params: {} };

  const supportingMetrics: Record<string, string | number> = { expense: cashFlowAnalysis.expense };
  if (topCategory) {
    supportingMetrics.topCategory = topCategory.category;
    supportingMetrics.topCategoryAmount = topCategory.amount;
    supportingMetrics.topCategoryPercentOfTotal = topCategory.percentOfTotal;
  }
  if (largestExpense) supportingMetrics.largestExpenseAmount = largestExpense.amount;

  return {
    answer,
    reason,
    supportingMetrics,
    confidence: computeAnswerConfidence({ hasData }),
    relatedRecommendations: data.actionableRecommendations.slice(0, MAX_RELATED_RECOMMENDATIONS),
  };
}
