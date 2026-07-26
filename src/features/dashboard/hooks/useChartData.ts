import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { getDashboardPeriodRange, type DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";
import type { Transaction } from "@/features/finance/types";

const WINDOW_DAYS = 14;

// Built from local date parts (not toISOString, which is UTC) so this lines
// up with transaction dates, which are already plain local yyyy-MM-dd strings.
function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The first day of a transaction's month, as a "yyyy-MM-dd" key — used to
// bucket by month (for the "year" granularity) while keeping the same
// parseable key shape the rolling-window/day view already uses. Works
// directly on the "yyyy-MM-dd" string (no Date parsing, which would read
// as UTC and could drift across a day boundary relative to local time).
function monthKeyFromDateString(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function buildBuckets(
  transactions: Transaction[],
  keys: string[],
  bucketKeyFor: (dateStr: string) => string
) {
  const buckets = new Map<string, { income: number; expense: number }>();
  for (const key of keys) buckets.set(key, { income: 0, expense: 0 });

  const oldestKey = keys[0];
  let balanceBeforeWindow = 0;

  transactions.forEach((t) => {
    const key = bucketKeyFor(t.date);

    if (key < oldestKey) {
      if (t.type === "income") balanceBeforeWindow += t.amount;
      else if (t.type === "expense") balanceBeforeWindow -= t.amount;
      return;
    }

    const item = buckets.get(key);
    if (!item) return;

    if (t.type === "income") item.income += t.amount;
    else if (t.type === "expense") item.expense += t.amount;
  });

  let runningBalance = balanceBeforeWindow;

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => {
      runningBalance += value.income - value.expense;
      return { date, ...value, balance: runningBalance };
    });
}

// `granularity` is optional so any caller that doesn't opt into the
// Dashboard page's day/month/year selector (e.g. the separate Finance
// Dashboard page) keeps its exact original rolling-14-day-window behavior —
// a pure "this month so far" view would otherwise collapse back down to a
// single flat point every time a new month starts.
export function useChartData(now = new Date(), granularity?: DashboardPeriodGranularity) {
  const { transactions } = useTransactionStore();

  return useMemo(() => {
    if (granularity === undefined) {
      const keys: string[] = [];
      for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        keys.push(dayKey(day));
      }
      return buildBuckets(transactions, keys, (dateStr) => dateStr.slice(0, 10));
    }

    if (granularity === "year") {
      const year = now.getFullYear();
      const keys = Array.from({ length: 12 }, (_, i) => dayKey(new Date(year, i, 1)));
      return buildBuckets(transactions, keys, (dateStr) => monthKeyFromDateString(dateStr));
    }

    // "day" or "month": one bucket per calendar day across the selected range.
    const range = getDashboardPeriodRange(granularity, now);
    const keys: string[] = [];
    for (const d = new Date(range.start); d < range.end; d.setDate(d.getDate() + 1)) {
      keys.push(dayKey(d));
    }
    return buildBuckets(transactions, keys, (dateStr) => dateStr.slice(0, 10));
  }, [transactions, now, granularity]);
}
