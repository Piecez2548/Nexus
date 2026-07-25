import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

const WINDOW_DAYS = 14;

// Built from local date parts (not toISOString, which is UTC) so this lines
// up with transaction dates, which are already plain local yyyy-MM-dd strings.
function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Rolling window (not calendar-month) so the chart always has multiple days
// to plot — a pure "this month so far" view would collapse back down to a
// single flat point every time a new month starts.
export function useChartData(now = new Date()) {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    const daily = new Map<string, { income: number; expense: number }>();

    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      daily.set(dayKey(day), { income: 0, expense: 0 });
    }

    const oldestKey = [...daily.keys()][0];

    // Balance carried in from every transaction dated before the window,
    // so the running balance shown per day reflects the true all-time
    // total rather than resetting to 0 at the start of the chart.
    let balanceBeforeWindow = 0;

    transactions.forEach((t) => {
      const day = t.date.slice(0, 10);

      if (day < oldestKey) {
        if (t.type === "income") balanceBeforeWindow += t.amount;
        else if (t.type === "expense") balanceBeforeWindow -= t.amount;
        return;
      }

      const item = daily.get(day);
      if (!item) return;

      if (t.type === "income") {
        item.income += t.amount;
      } else if (t.type === "expense") {
        item.expense += t.amount;
      }
    });

    let runningBalance = balanceBeforeWindow;

    return Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => {
        runningBalance += value.income - value.expense;
        return { date, ...value, balance: runningBalance };
      });
  }, [transactions, now]);
}
