import { describe, expect, it } from "vitest";
import { computeExpenseByCategory } from "./expenseByCategory";
import type { Transaction } from "@/features/finance/types";

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("computeExpenseByCategory", () => {
  it("returns an empty array with no transactions", () => {
    expect(computeExpenseByCategory([])).toEqual([]);
  });

  it("ignores income and sums expenses per category", () => {
    const result = computeExpenseByCategory([
      txn({ type: "income", category: "Salary", amount: 1000 }),
      txn({ category: "Food", amount: 100 }),
      txn({ category: "Food", amount: 250 }),
      txn({ category: "Transport", amount: 40 }),
    ]);

    expect(result).toEqual([
      { name: "Food", value: 350 },
      { name: "Transport", value: 40 },
    ]);
  });

  it("filters to the given range when provided", () => {
    const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
    const result = computeExpenseByCategory([txn({ date: "2026-06-15", amount: 100 }), txn({ date: "2026-07-03", amount: 250 })], range);
    expect(result).toEqual([{ name: "Food", value: 250 }]);
  });
});
