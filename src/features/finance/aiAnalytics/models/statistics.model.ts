// Statistics — the spec's fuller shape, composing transactionStatistics.ts's
// existing averages/extremes with totals transactionStatistics.ts doesn't
// carry (totalIncome/totalExpense/totalTransactions/categoryCount/
// merchantCount). All-time totals, not window-scoped — consistent with
// totalTransactions/categoryCount/merchantCount also being all-time, rather
// than mixing an all-time count with a current-month income figure.
// Exported for future/API use; deliberately not wired into
// FinancialAnalysisResult (would sit redundantly next to the existing
// transactionStatistics field).

import { sumByType } from "@/features/finance/utils/cashFlowMath";
import type { RecipientProfile, Transaction } from "@/features/finance/types";
import type { TransactionExtreme, TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

export interface Statistics {
  readonly totalIncome: number;
  readonly totalExpense: number;
  readonly averageDailySpending: number;
  readonly averageWeeklySpending: number;
  readonly averageMonthlySpending: number;
  readonly largestExpense: TransactionExtreme | null;
  readonly smallestExpense: TransactionExtreme | null;
  readonly averageTransaction: number;
  readonly totalTransactions: number;
  readonly categoryCount: number;
  readonly merchantCount: number;
}

export function buildStatistics(transactionStatistics: TransactionStatistics, transactions: Transaction[], recipientProfiles: RecipientProfile[]): Statistics {
  const categoryCount = new Set(transactions.map((t) => t.category).filter((c): c is string => Boolean(c))).size;

  return {
    totalIncome: sumByType(transactions, "income"),
    totalExpense: sumByType(transactions, "expense"),
    averageDailySpending: transactionStatistics.averageDailySpending,
    averageWeeklySpending: transactionStatistics.averageWeeklySpending,
    averageMonthlySpending: transactionStatistics.averageMonthlySpending,
    largestExpense: transactionStatistics.largestTransaction,
    smallestExpense: transactionStatistics.smallestTransaction,
    averageTransaction: transactionStatistics.averageTransaction,
    totalTransactions: transactions.length,
    categoryCount,
    merchantCount: recipientProfiles.length,
  };
}
