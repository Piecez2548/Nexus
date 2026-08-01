import { describe, expect, it } from "vitest";
import { computePeriodForecast } from "./periodForecastCalculator";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 15); // 2026-07-15, day 15 of a 31-day month

function tx(overrides: Partial<Transaction>): Transaction {
  return { title: "x", amount: 0, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", ...overrides };
}

describe("computePeriodForecast", () => {
  it("linearly projects monthly income/expense from the days elapsed so far", () => {
    const transactions: Transaction[] = [
      tx({ title: "Salary", amount: 1000, type: "income", date: "2026-07-01" }),
      tx({ title: "Groceries", amount: 300, type: "expense", date: "2026-07-10" }),
      // Previous month, for the end-of-period balance baseline.
      tx({ title: "Salary", amount: 2000, type: "income", date: "2026-06-01" }),
      tx({ title: "Rent", amount: 500, type: "expense", date: "2026-06-05" }),
    ];

    const result = computePeriodForecast(transactions, "monthly", 3, false, now);

    expect(result.incomeSoFar).toBe(1000);
    expect(result.expenseSoFar).toBe(300);
    expect(result.expectedIncome).toBeCloseTo((1000 / 15) * 31, 5);
    expect(result.expectedExpense).toBeCloseTo((300 / 15) * 31, 5);
    expect(result.expectedSavings).toBeCloseTo(result.expectedIncome - result.expectedExpense, 5);
    expect(result.remainingExpectedExpense).toBeCloseTo(result.expectedExpense - 300, 5);
    // Previous month's cumulative balance (2000 - 500 = 1500) + expectedSavings.
    expect(result.expectedEndOfPeriodBalance).toBeCloseTo(1500 + result.expectedSavings, 5);
    expect(result.rangeStart).toBe("2026-07-01");
    expect(result.rangeEnd).toBe("2026-08-01");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("has a null expectedEndOfPeriodBalance for weekly periods — no day-level cumulative balance primitive exists", () => {
    const result = computePeriodForecast([], "weekly", 0, true, now);
    expect(result.expectedEndOfPeriodBalance).toBeNull();
  });

  it("anchors the yearly end-of-period balance to December of the previous year", () => {
    const transactions: Transaction[] = [
      tx({ title: "Salary", amount: 500, type: "income", date: "2025-12-15" }),
      tx({ title: "Salary", amount: 100, type: "income", date: "2026-01-05" }), // should NOT count toward the previous-year baseline
    ];

    const result = computePeriodForecast(transactions, "yearly", 3, false, now);
    expect(result.expectedEndOfPeriodBalance).toBeCloseTo(500 + result.expectedSavings, 5);
  });

  it("returns zero projections with no transactions at all, and basis is insufficientData", () => {
    const result = computePeriodForecast([], "monthly", 0, true, now);
    expect(result.expectedIncome).toBe(0);
    expect(result.expectedExpense).toBe(0);
    expect(result.expectedSavings).toBe(0);
    expect(result.cashFlowStabilityScore).toBeNull();
    expect(result.basis).toBe("insufficientData");
  });

  it("basis is linearProjection once cash-flow stability is computable", () => {
    const transactions: Transaction[] = [
      tx({ title: "Salary", amount: 1000, type: "income", date: "2026-06-01" }),
      tx({ title: "Rent", amount: 500, type: "expense", date: "2026-06-05" }),
      tx({ title: "Salary", amount: 1000, type: "income", date: "2026-07-01" }),
      tx({ title: "Rent", amount: 500, type: "expense", date: "2026-07-05" }),
    ];
    const result = computePeriodForecast(transactions, "monthly", 2, false, now);
    expect(result.basis).toBe("linearProjection");
  });
});
