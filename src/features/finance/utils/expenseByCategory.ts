import { isDateWithinRange, type PeriodRange } from "@/features/finance/utils/periodRange";
import type { Transaction } from "@/features/finance/types";

export interface CategoryExpense {
  name: string;
  value: number;
}

// Sums expense transactions per category, optionally scoped to `range`. When
// `range` is omitted, sums all-time — matches every existing caller's
// "no granularity selected" behavior.
export function computeExpenseByCategory(transactions: Transaction[], range?: PeriodRange): CategoryExpense[] {
  const byCategory = new Map<string, number>();

  transactions
    .filter((t) => t.type === "expense" && t.category && (range === undefined || isDateWithinRange(t.date, range)))
    .forEach((t) => {
      const category = t.category as string;
      byCategory.set(category, (byCategory.get(category) ?? 0) + t.amount);
    });

  return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
}
