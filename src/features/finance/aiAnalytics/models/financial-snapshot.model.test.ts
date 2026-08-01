import { describe, expect, it } from "vitest";
import { buildFinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import type { Transaction } from "@/features/finance/types";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetAnalysisResult, BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

const now = new Date(2026, 6, 30); // 2026-07-30, matches "today" in this session

function cashFlow(overrides: Partial<CashFlowAnalysisResult> = {}): CashFlowAnalysisResult {
  return {
    income: 30000,
    expense: 20000,
    saving: 10000,
    savingRatePercent: 33.3,
    netCashFlow: 10000,
    changeVsPreviousMonth: { income: null, expense: null, saving: null },
    monthlyTrend: [],
    ...overrides,
  };
}

function budgetEntry(percentage: number): BudgetAnalysisEntry {
  return {
    budget: { category: "Food", amount: 5000, period: "monthly" },
    spent: (percentage / 100) * 5000,
    remaining: 5000 - (percentage / 100) * 5000,
    percentage,
    status: percentage >= 100 ? "over" : percentage >= 80 ? "near" : "ok",
    suggestedMonthlyCap: null,
    potentialMonthlySavings: null,
  };
}

function budgets(entries: BudgetAnalysisEntry[] = []): BudgetAnalysisResult {
  return {
    entries,
    overCount: entries.filter((e) => e.status === "over").length,
    nearCount: entries.filter((e) => e.status === "near").length,
    okCount: entries.filter((e) => e.status === "ok").length,
  };
}

function spending(overrides: Partial<SpendingAnalysisResult> = {}): SpendingAnalysisResult {
  return {
    topCategories: [],
    categoryComparison: [],
    monthlyTrend: [],
    dailyTrend: [],
    weekdayAnalysis: [],
    weeklyTrend: [],
    highestSpendingDay: null,
    mostExpensiveWeek: null,
    ...overrides,
  };
}

function behavior(overrides: Partial<BehaviorAnalysisResult> = {}): BehaviorAnalysisResult {
  return {
    flags: [],
    largePurchases: [],
    topMerchants: [],
    subscriptions: [],
    impulsePurchases: [],
    mostActiveHour: { hour: null, dataQuality: "unavailable" },
    mostActiveWeekday: null,
    ...overrides,
  };
}

function stats(overrides: Partial<TransactionStatistics> = {}): TransactionStatistics {
  return {
    averageDailySpending: 0,
    averageWeeklySpending: 0,
    averageMonthlySpending: 0,
    averageTransaction: 0,
    largestTransaction: null,
    smallestTransaction: null,
    ...overrides,
  };
}

function tx(date: string, amount: number, type: Transaction["type"] = "expense"): Transaction {
  return { title: "Test", amount, type, account: "Cash", date };
}

describe("buildFinancialSnapshot", () => {
  it("has no budgetUsagePercent and a zero transaction count on a brand-new profile", () => {
    const snapshot = buildFinancialSnapshot(cashFlow({ income: 0, expense: 0, saving: 0, netCashFlow: 0, savingRatePercent: null }), budgets(), spending(), behavior(), stats(), [], now);

    expect(snapshot.budgetUsagePercent).toBeNull();
    expect(snapshot.transactionCount).toBe(0);
    expect(snapshot.currentBalance).toBe(0);
  });

  it("passes through cash flow, category, and merchant totals verbatim", () => {
    const topCategories = [{ category: "Food", amount: 5000, percentOfTotal: 100 }];
    const topMerchants = [
      { alias: "7-Eleven", category: "Food", transactionCount: 3, totalAmount: 300, averagePurchase: 100, lastUsedDate: "2026-07-20", monthlyTrend: [] },
    ];

    const snapshot = buildFinancialSnapshot(
      cashFlow(),
      budgets(),
      spending({ topCategories }),
      behavior({ topMerchants }),
      stats({ averageTransaction: 150 }),
      [],
      now
    );

    expect(snapshot.income).toBe(30000);
    expect(snapshot.expense).toBe(20000);
    expect(snapshot.savings).toBe(10000);
    expect(snapshot.categoryTotals).toEqual(topCategories);
    expect(snapshot.merchantTotals).toEqual(topMerchants);
    expect(snapshot.averageSpending).toBe(150);
  });

  it("averages budget utilization across every budget", () => {
    const snapshot = buildFinancialSnapshot(cashFlow(), budgets([budgetEntry(50), budgetEntry(100)]), spending(), behavior(), stats(), [], now);
    expect(snapshot.budgetUsagePercent).toBe(75);
  });

  it("counts only this month's transactions and computes the running balance", () => {
    const transactions = [
      tx("2026-06-15", 1000, "expense"), // last month — excluded from the count
      tx("2026-07-05", 500, "expense"),
      tx("2026-07-10", 20000, "income"),
    ];

    const snapshot = buildFinancialSnapshot(cashFlow(), budgets(), spending(), behavior(), stats(), transactions, now);

    expect(snapshot.transactionCount).toBe(2);
    expect(snapshot.currentBalance).toBe(-1000 + 20000 - 500);
  });
});
