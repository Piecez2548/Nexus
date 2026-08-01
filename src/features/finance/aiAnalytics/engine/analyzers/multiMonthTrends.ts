import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import type { Transaction } from "@/features/finance/types";

// One sum per trailing month, oldest first — category=null sums every
// transaction of `type`, category=<name> restricts to just that category.
// Shared by every rule that needs a multi-month view instead of a single
// period, so no rule re-derives its own month-by-month bucketing.
export function monthlyValuesFor(transactions: Transaction[], category: string | null, type: "income" | "expense", months: number, now = new Date()): number[] {
  return lastNMonthRanges(months, now).map((m) =>
    transactions
      .filter((t) => t.type === type && (category === null || t.category === category) && isDateWithinRange(t.date, m.range))
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

// How many trailing months (walking backward from the most recent) satisfy
// predicate, stopping at the first one that doesn't — a "run" must be
// unbroken and end at the most recent month, not just appear somewhere in
// the window. Powers rules like "3 consecutive negative cash-flow months"
// or "budget over for 2+ months running".
export function trailingConsecutiveCount(values: number[], predicate: (value: number) => boolean): number {
  let count = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (!predicate(values[i])) break;
    count++;
  }
  return count;
}

// Same "unbroken run ending at the most recent month" semantics as
// trailingConsecutiveCount, but for a month-over-month increase instead of
// a per-month threshold. Powers rules like "Food spending has increased 3
// months running". Strict inequality — a tie doesn't count as an increase.
export function trailingIncreasingCount(values: number[]): number {
  let count = 0;
  for (let i = values.length - 1; i > 0; i--) {
    if (!(values[i] > values[i - 1])) break;
    count++;
  }
  return count;
}
