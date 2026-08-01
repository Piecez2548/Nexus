import { describe, expect, it } from "vitest";
import { buildFinancialHighlights } from "./financialHighlightsBuilder";
import type { FinancialSnapshot } from "@/features/finance/aiAnalytics/models/financial-snapshot.model";
import type { BudgetAnalysisResult, BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CategoryComparisonEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

function snapshot(overrides: Partial<FinancialSnapshot> = {}): FinancialSnapshot {
  return {
    income: 30000,
    expense: 20000,
    savings: 10000,
    netCashFlow: 10000,
    savingRatePercent: 33.3,
    budgetUsagePercent: 50,
    categoryTotals: [{ category: "Food", amount: 5000, percentOfTotal: 25 }],
    merchantTotals: [],
    transactionCount: 10,
    averageSpending: 2000,
    largestExpense: null,
    currentBalance: 50000,
    ...overrides,
  };
}

function habit(overrides: Partial<DetectedHabit> = {}): DetectedHabit {
  return { id: "h1", polarity: "positive", confidence: 60, message: { key: "aiAnalytics.behaviorProfile.detectors.coffee.positive", params: {} }, supportingMetrics: {}, ...overrides };
}

function budgetEntry(overrides: Partial<BudgetAnalysisEntry> = {}): BudgetAnalysisEntry {
  return {
    budget: { id: 1, category: "Food", amount: 1000, period: "monthly" },
    spent: 500,
    remaining: 500,
    percentage: 50,
    status: "ok",
    suggestedMonthlyCap: null,
    potentialMonthlySavings: null,
    ...overrides,
  };
}

function budgetAnalysis(entries: BudgetAnalysisEntry[]): BudgetAnalysisResult {
  return { entries, overCount: entries.filter((e) => e.status === "over").length, nearCount: entries.filter((e) => e.status === "near").length, okCount: entries.filter((e) => e.status === "ok").length };
}

describe("buildFinancialHighlights", () => {
  it("includes highestSpendingCategory from the top category total", () => {
    const result = buildFinancialHighlights(snapshot(), [], [], budgetAnalysis([]));
    const entry = result.entries.find((e) => e.type === "highestSpendingCategory");
    expect(entry?.message.params.category).toBe("Food");
  });

  it("omits highestSpendingCategory when there are no category totals", () => {
    const result = buildFinancialHighlights(snapshot({ categoryTotals: [] }), [], [], budgetAnalysis([]));
    expect(result.entries.find((e) => e.type === "highestSpendingCategory")).toBeUndefined();
  });

  it("includes bestPerformingHabit as the max-confidence positive habit, reusing its own message", () => {
    const habits = [habit({ id: "low", confidence: 40, message: { key: "low-key", params: {} } }), habit({ id: "high", confidence: 90, message: { key: "high-key", params: {} } })];
    const result = buildFinancialHighlights(snapshot(), habits, [], budgetAnalysis([]));
    const entry = result.entries.find((e) => e.type === "bestPerformingHabit");
    expect(entry?.message.key).toBe("high-key");
  });

  it("omits bestPerformingHabit when there are no positive habits", () => {
    const result = buildFinancialHighlights(snapshot(), [], [], budgetAnalysis([]));
    expect(result.entries.find((e) => e.type === "bestPerformingHabit")).toBeUndefined();
  });

  it("includes largestImprovement as the category with the biggest spending decrease", () => {
    const comparison: CategoryComparisonEntry[] = [
      { category: "Shopping", current: 100, previous: 90, changePercent: 11.1 }, // increased, must be ignored
      { category: "Food", current: 400, previous: 500, changePercent: -20 },
      { category: "Coffee", current: 90, previous: 100, changePercent: -10 },
    ];
    const result = buildFinancialHighlights(snapshot(), [], comparison, budgetAnalysis([]));
    const entry = result.entries.find((e) => e.type === "largestImprovement");
    expect(entry?.message.params.category).toBe("Food");
  });

  it("omits largestImprovement when every category increased (never mislabels the smallest increase as an improvement)", () => {
    const comparison: CategoryComparisonEntry[] = [{ category: "Food", current: 110, previous: 100, changePercent: 10 }];
    const result = buildFinancialHighlights(snapshot(), [], comparison, budgetAnalysis([]));
    expect(result.entries.find((e) => e.type === "largestImprovement")).toBeUndefined();
  });

  it("includes savingAchievement when the saving rate is positive", () => {
    const result = buildFinancialHighlights(snapshot({ savingRatePercent: 25, savings: 5000 }), [], [], budgetAnalysis([]));
    const entry = result.entries.find((e) => e.type === "savingAchievement");
    expect(entry?.message.params.savingRatePercent).toBe(25);
  });

  it("omits savingAchievement when the saving rate is null or non-positive", () => {
    const nullCase = buildFinancialHighlights(snapshot({ savingRatePercent: null }), [], [], budgetAnalysis([]));
    const negativeCase = buildFinancialHighlights(snapshot({ savingRatePercent: -5 }), [], [], budgetAnalysis([]));
    expect(nullCase.entries.find((e) => e.type === "savingAchievement")).toBeUndefined();
    expect(negativeCase.entries.find((e) => e.type === "savingAchievement")).toBeUndefined();
  });

  it("includes budgetAchievement with the on-track count when budgets exist", () => {
    const result = buildFinancialHighlights(snapshot(), [], [], budgetAnalysis([budgetEntry({ status: "ok" }), budgetEntry({ status: "over" })]));
    const entry = result.entries.find((e) => e.type === "budgetAchievement");
    expect(entry?.message.params).toEqual({ okCount: 1, totalCount: 2 });
  });

  it("omits budgetAchievement when there are no budgets at all", () => {
    const result = buildFinancialHighlights(snapshot(), [], [], budgetAnalysis([]));
    expect(result.entries.find((e) => e.type === "budgetAchievement")).toBeUndefined();
  });
});
