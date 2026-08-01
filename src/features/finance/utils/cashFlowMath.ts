import { isDateWithinRange, startOfWeek, type PeriodRange } from "@/features/finance/utils/periodRange";
import { toLocalDateString } from "@/utils/localDate";
import type { Transaction } from "@/features/finance/types";

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function sumByType(transactions: Transaction[], type: "income" | "expense", range?: PeriodRange) {
  return transactions
    .filter((t) => t.type === type && (range === undefined || isDateWithinRange(t.date, range)))
    .reduce((sum, t) => sum + t.amount, 0);
}

// Running balance using every transaction dated on or before the end of
// `upToMonth`, so it reflects the same cumulative total the all-time
// balance would have shown at that point in time. Balance is a true
// cumulative/net-worth-like figure — it always compares month-over-month,
// independent of any selected day/month/year granularity.
export function cumulativeBalanceAsOf(transactions: Transaction[], upToMonth: string) {
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
export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export interface MonthRange {
  monthKey: string;
  range: PeriodRange;
}

// The last `n` calendar months up to and including `now`'s (possibly
// partial) month, oldest first. Shared by every analyzer that needs to
// "walk back N months" — income stability, the cash-flow sub-score, the
// monthly trend chart, and the forecast — so they all agree on exactly
// which months count as "recent history".
export function lastNMonthRanges(n: number, now = new Date()): MonthRange[] {
  const months: MonthRange[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ monthKey: monthKey(monthStart), range: { start: monthStart, end: monthEnd } });
  }
  return months;
}

export interface WeekRange {
  weekStart: string;
  range: PeriodRange;
}

// The last `n` Monday-anchored weeks up to and including `now`'s (possibly
// partial) week, oldest first — mirrors lastNMonthRanges's exact shape, one
// level finer-grained, for signals that need a weekly rather than monthly
// bucket (e.g. "most expensive week").
export function lastNWeekRanges(n: number, now = new Date()): WeekRange[] {
  const currentWeekStart = startOfWeek(now);
  const weeks: WeekRange[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weeks.push({ weekStart: toLocalDateString(start), range: { start, end } });
  }

  return weeks;
}
