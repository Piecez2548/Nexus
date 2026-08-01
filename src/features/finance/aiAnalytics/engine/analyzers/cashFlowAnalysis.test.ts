import { describe, expect, it } from "vitest";
import { analyzeCashFlow } from "./cashFlowAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("analyzeCashFlow", () => {
  it("returns zeroed figures with no transactions", () => {
    const result = analyzeCashFlow([], now);
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
    expect(result.saving).toBe(0);
    expect(result.savingRatePercent).toBeNull();
    expect(result.monthlyTrend).toHaveLength(6);
  });

  it("computes the current month's income/expense/saving/savingRate", () => {
    const result = analyzeCashFlow(
      [txn({ type: "income", amount: 30000, date: "2026-07-01" }), txn({ type: "expense", amount: 20000, date: "2026-07-05" })],
      now,
    );
    expect(result.income).toBe(30000);
    expect(result.expense).toBe(20000);
    expect(result.saving).toBe(10000);
    expect(result.savingRatePercent).toBeCloseTo((10000 / 30000) * 100, 5);
    expect(result.netCashFlow).toBe(10000);
  });

  it("computes % change vs the previous month", () => {
    const result = analyzeCashFlow(
      [
        txn({ type: "income", amount: 20000, date: "2026-06-01" }),
        txn({ type: "income", amount: 30000, date: "2026-07-01" }),
      ],
      now,
    );
    expect(result.changeVsPreviousMonth.income).toBe(50);
  });

  it("returns null change when the previous month has no data", () => {
    const result = analyzeCashFlow([txn({ type: "income", amount: 30000, date: "2026-07-01" })], now);
    expect(result.changeVsPreviousMonth.income).toBeNull();
  });

  it("returns a 6-month trailing trend, oldest first, ending with the current month", () => {
    const result = analyzeCashFlow([txn({ type: "income", amount: 1000, date: "2026-07-01" })], now);
    expect(result.monthlyTrend.map((m) => m.monthKey)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]);
    expect(result.monthlyTrend[5].income).toBe(1000);
  });
});
