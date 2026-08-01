import { describe, expect, it } from "vitest";
import { analyzeSpending } from "./spendingAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21, Tuesday

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("analyzeSpending", () => {
  it("returns empty results with no transactions", () => {
    const result = analyzeSpending([], [], now);
    expect(result.topCategories).toEqual([]);
    expect(result.categoryComparison).toEqual([]);
    expect(result.dailyTrend).toEqual([]);
    expect(result.weekdayAnalysis.every((w) => w.count === 0)).toBe(true);
  });

  it("ranks top categories by amount with correct percentOfTotal", () => {
    const result = analyzeSpending(
      [txn({ category: "Food", amount: 300 }), txn({ category: "Transport", amount: 100 })],
      [],
      now,
    );
    expect(result.topCategories[0]).toMatchObject({ category: "Food", amount: 300, percentOfTotal: 75 });
    expect(result.topCategories[1]).toMatchObject({ category: "Transport", amount: 100, percentOfTotal: 25 });
  });

  it("compares current vs previous month spend per category", () => {
    const result = analyzeSpending(
      [
        txn({ category: "Food", amount: 1200, date: "2026-07-10" }),
        txn({ category: "Food", amount: 1000, date: "2026-06-10" }),
      ],
      [],
      now,
    );
    const food = result.categoryComparison.find((c) => c.category === "Food");
    expect(food).toMatchObject({ current: 1200, previous: 1000, changePercent: 20 });
  });

  it("returns null changePercent for a category with no previous-period spend", () => {
    const result = analyzeSpending([txn({ category: "Shopping", amount: 500, date: "2026-07-10" })], [], now);
    const shopping = result.categoryComparison.find((c) => c.category === "Shopping");
    expect(shopping?.changePercent).toBeNull();
  });

  it("groups daily trend by local calendar date within the current month", () => {
    const result = analyzeSpending(
      [txn({ date: "2026-07-05", amount: 100 }), txn({ date: "2026-07-05", amount: 50 }), txn({ date: "2026-07-06", amount: 200 })],
      [],
      now,
    );
    expect(result.dailyTrend).toEqual([
      { date: "2026-07-05", amount: 150 },
      { date: "2026-07-06", amount: 200 },
    ]);
  });

  it("aggregates weekday totals/counts/averages using the local weekday", () => {
    // 2026-07-05 is a Sunday (weekday 0).
    const result = analyzeSpending(
      [txn({ date: "2026-07-05", amount: 100 }), txn({ date: "2026-07-12", amount: 300 })],
      [],
      now,
    );
    const sunday = result.weekdayAnalysis[0];
    expect(sunday).toMatchObject({ weekday: 0, total: 400, count: 2, average: 200 });
  });

  it("passes the given monthlyTrend through unchanged", () => {
    const trend = [{ monthKey: "2026-07", income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0 }];
    const result = analyzeSpending([], trend, now);
    expect(result.monthlyTrend).toBe(trend);
  });

  describe("weeklyTrend", () => {
    it("returns null highestSpendingDay/mostExpensiveWeek with no transactions", () => {
      const result = analyzeSpending([], [], now);
      expect(result.highestSpendingDay).toBeNull();
      expect(result.mostExpensiveWeek).toBeNull();
      expect(result.weeklyTrend.every((w) => w.amount === 0)).toBe(true);
    });

    it("buckets expenses into Monday-anchored weeks across the trailing window", () => {
      // 2026-07-21 is a Tuesday; its week starts 2026-07-20.
      const result = analyzeSpending([txn({ date: "2026-07-20", amount: 500 })], [], now);
      const currentWeek = result.weeklyTrend[result.weeklyTrend.length - 1];
      expect(currentWeek).toMatchObject({ weekStart: "2026-07-20", amount: 500 });
    });

    it("picks the single highest-amount day, ignoring zero days", () => {
      const result = analyzeSpending(
        [txn({ date: "2026-07-05", amount: 100 }), txn({ date: "2026-07-06", amount: 900 })],
        [],
        now,
      );
      expect(result.highestSpendingDay).toEqual({ date: "2026-07-06", amount: 900 });
    });

    it("picks the single most expensive week within the trailing window", () => {
      const result = analyzeSpending(
        [txn({ date: "2026-07-20", amount: 100 }), txn({ date: "2026-06-01", amount: 900 })],
        [],
        now,
      );
      expect(result.mostExpensiveWeek?.amount).toBe(900);
    });
  });
});
