import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import type { Transaction } from "@/features/finance/types";

// One sum per trailing month, oldest first — category=null sums every
// transaction of `type`, category=<name> restricts to just that category.
// Shared by every rule that needs a multi-month view instead of a single
// period, so no rule re-derives its own month-by-month bucketing.
//
// Single pass over `transactions` rather than one full filter+reduce per
// month (previously O(months × transactions), and this helper runs many
// times per analysis — once per over-budget category, once per forecast
// category, and again for every historical point in the score trend). Each
// trailing range from lastNMonthRanges is exactly one whole calendar month,
// so membership reduces to matching a transaction's "YYYY-MM" prefix against
// the month's key — the same inclusion rule isDateWithinRange applies to
// these ranges (and the same slice(0, 7) convention cumulativeBalanceAsOf
// already uses on these ISO dates). Each bucket still accumulates its
// transactions in original array order, so the result — including
// floating-point summation order — is byte-for-byte identical to before.
export function monthlyValuesFor(transactions: Transaction[], category: string | null, type: "income" | "expense", months: number, now = new Date()): number[] {
  const ranges = lastNMonthRanges(months, now);
  const indexByMonthKey = new Map(ranges.map((m, i) => [m.monthKey, i]));
  const values = new Array<number>(ranges.length).fill(0);

  for (const t of transactions) {
    if (t.type !== type) continue;
    if (category !== null && t.category !== category) continue;
    const index = indexByMonthKey.get(t.date.slice(0, 7));
    if (index !== undefined) values[index] += t.amount;
  }

  return values;
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
