import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { getDashboardPeriodRange, getPreviousDashboardPeriodRange, type DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import { isDateWithinRange, type PeriodRange } from "@/features/finance/utils/periodRange";
import type { Transaction } from "@/features/finance/types";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumByType(transactions: Transaction[], type: "income" | "expense", range?: PeriodRange) {
  return transactions
    .filter((t) => t.type === type && (range === undefined || isDateWithinRange(t.date, range)))
    .reduce((sum, t) => sum + t.amount, 0);
}

// Running balance using every transaction dated on or before the end of
// `upToMonth`, so it reflects the same cumulative total the all-time
// balance would have shown at that point in time. Balance is a true
// cumulative/net-worth-like figure — it always compares month-over-month,
// independent of the dashboard's selected day/month/year granularity,
// which only scopes income/expense/saving.
function cumulativeBalanceAsOf(transactions: Transaction[], upToMonth: string) {
  return transactions.reduce((sum, t) => {
    if (t.date.slice(0, 7) > upToMonth) return sum;
    if (t.type === "income") return sum + t.amount;
    if (t.type === "expense") return sum - t.amount;
    return sum;
  }, 0);
}

// Percentage change from `prev` to `cur`. Returns null when there's no
// prior-period data to compare against (avoids a division by zero reading
// as a misleading +/-Infinity%).
function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

// `granularity` defaults to "month" so any caller that doesn't opt into the
// Dashboard page's day/month/year selector (e.g. the separate Finance
// Dashboard page) keeps its exact original month-over-month behavior.
export function useDashboard(now = new Date(), granularity: DashboardPeriodGranularity = "month") {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    // Balance is all-time and unaffected by the period selector.
    const balance = sumByType(transactions, "income") - sumByType(transactions, "expense");

    const range = getDashboardPeriodRange(granularity, now);
    const previousRange = getPreviousDashboardPeriodRange(granularity, now);

    const income = sumByType(transactions, "income", range);
    const expense = sumByType(transactions, "expense", range);
    const saving = income - expense;

    const prevIncome = sumByType(transactions, "income", previousRange);
    const prevExpense = sumByType(transactions, "expense", previousRange);
    const prevSaving = prevIncome - prevExpense;

    const currentMonth = monthKey(now);
    const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const curBalance = cumulativeBalanceAsOf(transactions, currentMonth);
    const prevBalance = cumulativeBalanceAsOf(transactions, previousMonth);

    return {
      income,
      expense,
      balance,
      saving,
      changes: {
        income: pctChange(income, prevIncome),
        expense: pctChange(expense, prevExpense),
        saving: pctChange(saving, prevSaving),
        balance: pctChange(curBalance, prevBalance),
      },
      // Raw current/previous-period figures, for panels that want the
      // actual numbers rather than just the derived % change (named
      // `monthly` for its original month-over-month use — the values
      // reflect whichever `granularity` was requested).
      monthly: {
        current: { income, expense, saving },
        previous: { income: prevIncome, expense: prevExpense, saving: prevSaving },
      },
    };
  }, [transactions, now, granularity]);
}
