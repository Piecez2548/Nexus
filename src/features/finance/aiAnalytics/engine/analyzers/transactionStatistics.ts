import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { Transaction } from "@/features/finance/types";

export interface TransactionExtreme {
  id: number | undefined;
  title: string;
  amount: number;
  category: string | undefined;
  date: string;
}

export interface TransactionStatistics {
  averageDailySpending: number;
  averageWeeklySpending: number;
  averageMonthlySpending: number;
  averageTransaction: number;
  // Structurally distinct from behaviorAnalysis.largePurchases (a top-5
  // ranking) — the UI leans on that existing list to surface the largest
  // purchase rather than rendering this value a second time, but it's kept
  // here as a standalone field so every other statistic on this result
  // doesn't need a second source to find it.
  largestTransaction: TransactionExtreme | null;
  smallestTransaction: TransactionExtreme | null;
}

// Mirrors behaviorAnalysis.ts's own 3-month window for individual-transaction
// signals (largePurchases) — largest/smallest/average-transaction-size are
// the same kind of signal (notable single transactions, or the shape of a
// "typical" one), so they share its scope rather than inventing a new one.
const TRANSACTION_WINDOW_MONTHS = 3;

function windowRange(now: Date) {
  const months = lastNMonthRanges(TRANSACTION_WINDOW_MONTHS, now);
  return { start: months[0].range.start, end: months[months.length - 1].range.end };
}

function toExtreme(t: Transaction): TransactionExtreme {
  return { id: t.id, title: t.title, amount: t.amount, category: t.category, date: t.date };
}

export function computeTransactionStatistics(
  transactions: Transaction[],
  spendingAnalysis: SpendingAnalysisResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  now = new Date()
): TransactionStatistics {
  // now.getDate() is always >= 1, so this never divides by zero.
  const averageDailySpending = cashFlowAnalysis.expense / now.getDate();

  const averageWeeklySpending =
    spendingAnalysis.weeklyTrend.length > 0
      ? spendingAnalysis.weeklyTrend.reduce((sum, w) => sum + w.amount, 0) / spendingAnalysis.weeklyTrend.length
      : 0;

  // Excludes the current, still-in-progress month — same reasoning as
  // timeline.ts's monthlySummaryEvents: a partial month reads as an
  // artificially low "average" simply because it isn't over yet. Falls back
  // to including it only when there's no completed month to average instead
  // (a brand-new profile with under a month of history).
  const completedMonths = cashFlowAnalysis.monthlyTrend.slice(0, -1);
  const monthsForAverage = completedMonths.length > 0 ? completedMonths : cashFlowAnalysis.monthlyTrend;
  const averageMonthlySpending = monthsForAverage.length > 0 ? monthsForAverage.reduce((sum, m) => sum + m.expense, 0) / monthsForAverage.length : 0;

  const range = windowRange(now);
  const windowExpenses = transactions.filter((t) => t.type === "expense" && isDateWithinRange(t.date, range));

  const averageTransaction = windowExpenses.length > 0 ? windowExpenses.reduce((sum, t) => sum + t.amount, 0) / windowExpenses.length : 0;
  const largestTransaction = windowExpenses.length > 0 ? toExtreme(windowExpenses.reduce((max, t) => (t.amount > max.amount ? t : max))) : null;
  const smallestTransaction = windowExpenses.length > 0 ? toExtreme(windowExpenses.reduce((min, t) => (t.amount < min.amount ? t : min))) : null;

  return { averageDailySpending, averageWeeklySpending, averageMonthlySpending, averageTransaction, largestTransaction, smallestTransaction };
}
