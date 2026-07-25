import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumByType(transactions: Transaction[], type: "income" | "expense", month?: string) {
  return transactions
    .filter((t) => t.type === type && (month === undefined || t.date.slice(0, 7) === month))
    .reduce((sum, t) => sum + t.amount, 0);
}

// Running balance using every transaction dated on or before the end of
// `upToMonth`, so it reflects the same cumulative total the all-time
// balance would have shown at that point in time.
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

export function useDashboard(now = new Date()) {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    const income = sumByType(transactions, "income");
    const expense = sumByType(transactions, "expense");
    const balance = income - expense;
    const saving = balance;

    const currentMonth = monthKey(now);
    const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const curIncome = sumByType(transactions, "income", currentMonth);
    const prevIncome = sumByType(transactions, "income", previousMonth);
    const curExpense = sumByType(transactions, "expense", currentMonth);
    const prevExpense = sumByType(transactions, "expense", previousMonth);
    const curSaving = curIncome - curExpense;
    const prevSaving = prevIncome - prevExpense;
    const curBalance = cumulativeBalanceAsOf(transactions, currentMonth);
    const prevBalance = cumulativeBalanceAsOf(transactions, previousMonth);

    return {
      income,
      expense,
      balance,
      saving,
      changes: {
        income: pctChange(curIncome, prevIncome),
        expense: pctChange(curExpense, prevExpense),
        saving: pctChange(curSaving, prevSaving),
        balance: pctChange(curBalance, prevBalance),
      },
      // Raw current/previous-month figures, for panels that want the actual
      // numbers rather than just the derived % change (e.g. a month-over-
      // month comparison view).
      monthly: {
        current: { income: curIncome, expense: curExpense, saving: curSaving },
        previous: { income: prevIncome, expense: prevExpense, saving: prevSaving },
      },
    };
  }, [transactions, now]);
}
