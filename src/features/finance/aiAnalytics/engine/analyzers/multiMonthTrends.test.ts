import { describe, expect, it } from "vitest";
import { monthlyValuesFor, trailingConsecutiveCount, trailingIncreasingCount } from "./multiMonthTrends";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("monthlyValuesFor", () => {
  it("sums all expense transactions per trailing month, zero-filling months with no data", () => {
    const transactions = [txn({ amount: 300, date: "2026-07-05" }), txn({ amount: 100, date: "2026-06-05" })];
    const values = monthlyValuesFor(transactions, null, "expense", 3, now);
    expect(values).toEqual([0, 100, 300]); // May, Jun, Jul
  });

  it("restricts to a specific category", () => {
    const transactions = [txn({ amount: 300, category: "Food", date: "2026-07-05" }), txn({ amount: 500, category: "Shopping", date: "2026-07-05" })];
    const values = monthlyValuesFor(transactions, "Food", "expense", 1, now);
    expect(values).toEqual([300]);
  });

  it("restricts to a transaction type", () => {
    const transactions = [txn({ amount: 300, type: "expense", date: "2026-07-05" }), txn({ amount: 30000, type: "income", date: "2026-07-05" })];
    const incomeValues = monthlyValuesFor(transactions, null, "income", 1, now);
    expect(incomeValues).toEqual([30000]);
  });

  it("sums multiple transactions within the same month and excludes ones outside the window", () => {
    const transactions = [
      txn({ amount: 40, date: "2026-07-02" }),
      txn({ amount: 60, date: "2026-07-20" }), // same month as above → 100 combined
      txn({ amount: 100, date: "2026-05-15" }),
      txn({ amount: 999, date: "2026-04-30" }), // older than the 3-month window → excluded
    ];
    const values = monthlyValuesFor(transactions, null, "expense", 3, now);
    expect(values).toEqual([100, 0, 100]); // May, Jun, Jul
  });
});

describe("trailingConsecutiveCount", () => {
  it("counts trailing months satisfying the predicate, stopping at the first that doesn't", () => {
    const values = [500, -100, -50, -20]; // oldest first
    expect(trailingConsecutiveCount(values, (v) => v < 0)).toBe(3);
  });

  it("returns 0 when the most recent month doesn't satisfy the predicate", () => {
    const values = [-100, -50, 20];
    expect(trailingConsecutiveCount(values, (v) => v < 0)).toBe(0);
  });

  it("returns the full length when every month satisfies the predicate", () => {
    const values = [-1, -2, -3];
    expect(trailingConsecutiveCount(values, (v) => v < 0)).toBe(3);
  });

  it("ignores a non-trailing gap earlier in the window", () => {
    // The middle month breaks the run, but only the unbroken suffix counts.
    const values = [-10, 50, -5, -5];
    expect(trailingConsecutiveCount(values, (v) => v < 0)).toBe(2);
  });
});

describe("trailingIncreasingCount", () => {
  it("counts a trailing strictly-increasing run", () => {
    const values = [100, 200, 150, 300, 400]; // oldest first
    expect(trailingIncreasingCount(values)).toBe(2); // 300 -> 400 only; 150 breaks it
  });

  it("returns 0 when the last two months aren't increasing", () => {
    expect(trailingIncreasingCount([100, 200, 200])).toBe(0);
    expect(trailingIncreasingCount([300, 200, 100])).toBe(0);
  });

  it("does not count a tie as an increase", () => {
    expect(trailingIncreasingCount([100, 100])).toBe(0);
  });

  it("returns 0 for a single value (nothing to compare against)", () => {
    expect(trailingIncreasingCount([100])).toBe(0);
  });
});
