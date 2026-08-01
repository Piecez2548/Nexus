// FinancialSnapshot — the spec's "core model": every headline number the
// engine already computes, bundled into one object. Nothing here is new
// statistics; every field is read straight from an already-computed
// analyzer result, except `transactionCount` and `currentBalance`, which
// reuse existing utilities (getCurrentPeriodRange/isDateWithinRange,
// cumulativeBalanceAsOf) rather than duplicating their logic.

import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import { cumulativeBalanceAsOf, monthKey } from "@/features/finance/utils/cashFlowMath";
import type { Transaction } from "@/features/finance/types";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { SpendingAnalysisResult, TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult, TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { TransactionStatistics, TransactionExtreme } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

export interface FinancialSnapshot {
  readonly income: number;
  readonly expense: number;
  readonly savings: number;
  readonly netCashFlow: number;
  readonly savingRatePercent: number | null;
  // Average utilization across every budget this period (clamped 0-100 per
  // budget, same clamped `percentage` field budgetAnalysis.ts already
  // exposes for progress-bar display) — null when there are no budgets to
  // average.
  readonly budgetUsagePercent: number | null;
  readonly categoryTotals: readonly TopCategoryEntry[];
  readonly merchantTotals: readonly TopMerchantEntry[];
  readonly transactionCount: number;
  readonly averageSpending: number;
  readonly largestExpense: TransactionExtreme | null;
  readonly currentBalance: number;
}

function averageBudgetUsagePercent(budgetAnalysis: BudgetAnalysisResult): number | null {
  if (budgetAnalysis.entries.length === 0) return null;
  const total = budgetAnalysis.entries.reduce((sum, e) => sum + e.percentage, 0);
  return total / budgetAnalysis.entries.length;
}

export function buildFinancialSnapshot(
  cashFlowAnalysis: CashFlowAnalysisResult,
  budgetAnalysis: BudgetAnalysisResult,
  spendingAnalysis: SpendingAnalysisResult,
  behaviorAnalysis: BehaviorAnalysisResult,
  transactionStatistics: TransactionStatistics,
  transactions: Transaction[],
  now = new Date()
): FinancialSnapshot {
  const currentMonthRange = getCurrentPeriodRange("monthly", now);
  const transactionCount = transactions.filter((t) => isDateWithinRange(t.date, currentMonthRange)).length;

  return {
    income: cashFlowAnalysis.income,
    expense: cashFlowAnalysis.expense,
    savings: cashFlowAnalysis.saving,
    netCashFlow: cashFlowAnalysis.netCashFlow,
    savingRatePercent: cashFlowAnalysis.savingRatePercent,
    budgetUsagePercent: averageBudgetUsagePercent(budgetAnalysis),
    categoryTotals: spendingAnalysis.topCategories,
    merchantTotals: behaviorAnalysis.topMerchants,
    transactionCount,
    averageSpending: transactionStatistics.averageTransaction,
    largestExpense: transactionStatistics.largestTransaction,
    currentBalance: cumulativeBalanceAsOf(transactions, monthKey(now)),
  };
}
