import { describe, expect, it } from "vitest";
import { computeTransactionStatistics } from "./transactionStatistics";
import type { SpendingAnalysisResult, WeeklyTrendPoint } from "./spendingAnalysis";
import type { CashFlowAnalysisResult, CashFlowMonthPoint } from "./cashFlowAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function spending(weeklyTrend: WeeklyTrendPoint[] = []): SpendingAnalysisResult {
  return {
    topCategories: [],
    categoryComparison: [],
    monthlyTrend: [],
    dailyTrend: [],
    weekdayAnalysis: [],
    weeklyTrend,
    highestSpendingDay: null,
    mostExpensiveWeek: null,
  };
}

function monthPoint(overrides: Partial<CashFlowMonthPoint> = {}): CashFlowMonthPoint {
  return { monthKey: "2026-07", income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, ...overrides };
}

function cashFlow(overrides: Partial<CashFlowAnalysisResult> = {}): CashFlowAnalysisResult {
  return {
    income: 0,
    expense: 0,
    saving: 0,
    savingRatePercent: null,
    netCashFlow: 0,
    changeVsPreviousMonth: { income: null, expense: null, saving: null },
    monthlyTrend: [],
    ...overrides,
  };
}

describe("computeTransactionStatistics", () => {
  it("returns zeroed/null fields with no data", () => {
    const result = computeTransactionStatistics([], spending(), cashFlow(), now);
    expect(result.averageDailySpending).toBe(0);
    expect(result.averageWeeklySpending).toBe(0);
    expect(result.averageMonthlySpending).toBe(0);
    expect(result.averageTransaction).toBe(0);
    expect(result.largestTransaction).toBeNull();
    expect(result.smallestTransaction).toBeNull();
  });

  it("computes averageDailySpending as this month's expense divided by days elapsed", () => {
    const result = computeTransactionStatistics([], spending(), cashFlow({ expense: 2100 }), now);
    expect(result.averageDailySpending).toBe(100); // 2100 / 21 (now.getDate())
  });

  it("computes averageWeeklySpending as the mean of the weeklyTrend window", () => {
    const result = computeTransactionStatistics([], spending([{ weekStart: "2026-07-06", amount: 100 }, { weekStart: "2026-07-13", amount: 300 }]), cashFlow(), now);
    expect(result.averageWeeklySpending).toBe(200);
  });

  it("computes averageMonthlySpending excluding the current in-progress month", () => {
    const monthlyTrend = [monthPoint({ monthKey: "2026-05", expense: 1000 }), monthPoint({ monthKey: "2026-06", expense: 3000 }), monthPoint({ monthKey: "2026-07", expense: 50 })];
    const result = computeTransactionStatistics([], spending(), cashFlow({ monthlyTrend }), now);
    expect(result.averageMonthlySpending).toBe(2000); // mean of 1000, 3000 — excludes the partial 2026-07
  });

  it("falls back to including the current month when there's no completed month yet", () => {
    const monthlyTrend = [monthPoint({ monthKey: "2026-07", expense: 400 })];
    const result = computeTransactionStatistics([], spending(), cashFlow({ monthlyTrend }), now);
    expect(result.averageMonthlySpending).toBe(400);
  });

  it("computes averageTransaction, largestTransaction, and smallestTransaction from in-window expenses", () => {
    const transactions = [
      txn({ id: 1, amount: 300, date: "2026-07-10" }),
      txn({ id: 2, amount: 50, date: "2026-06-10" }),
      txn({ id: 3, amount: 700, date: "2026-05-10" }),
      txn({ id: 4, amount: 999, type: "income", date: "2026-07-10" }), // income excluded
      txn({ id: 5, amount: 999, date: "2025-01-01" }), // outside the 3-month window
    ];
    const result = computeTransactionStatistics(transactions, spending(), cashFlow(), now);
    expect(result.averageTransaction).toBe(350); // (300 + 50 + 700) / 3
    expect(result.largestTransaction?.id).toBe(3);
    expect(result.smallestTransaction?.id).toBe(2);
  });
});
