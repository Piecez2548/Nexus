import { describe, expect, it } from "vitest";
import { generateExecutiveSummary } from "./executiveSummary";
import type { HealthScoreResult } from "./healthScore";
import type { SpendingAnalysisResult, TopCategoryEntry, CategoryComparisonEntry } from "./spendingAnalysis";
import type { CashFlowAnalysisResult } from "./cashFlowAnalysis";
import type { Recommendation } from "./recommendations";

function healthScore(overrides: Partial<HealthScoreResult> = {}): HealthScoreResult {
  return { score: null, grade: null, insufficientData: true, subScores: [], ...overrides };
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

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "rec-1",
    key: "reduceOverBudgetCategory",
    priority: "medium",
    estimatedMonthlySavings: 500,
    confidence: "high",
    estimatedImpact: 10,
    params: {},
    title: { key: "aiAnalytics.recommendations.titles.reduceOverBudgetCategory", params: {} },
    reason: { key: "aiAnalytics.recommendations.reasons.reduceOverBudgetCategory", params: {} },
    action: { key: "aiAnalytics.recommendations.actions.reduceOverBudgetCategory", params: {} },
    ...overrides,
  };
}

describe("generateExecutiveSummary", () => {
  it("returns no parts when there's no data at all", () => {
    expect(generateExecutiveSummary(healthScore(), spending(), cashFlow(), [])).toEqual([]);
  });

  it("includes overallHealth only when both score and grade are present", () => {
    const parts = generateExecutiveSummary(healthScore({ score: 82, grade: "good" }), spending(), cashFlow(), []);
    expect(parts).toEqual([{ key: "overallHealth", params: { score: 82, grade: "good" } }]);
  });

  it("omits overallHealth when score is null (insufficient data)", () => {
    const parts = generateExecutiveSummary(healthScore({ score: null, grade: null }), spending(), cashFlow(), []);
    expect(parts.some((p) => p.key === "overallHealth")).toBe(false);
  });

  it("includes topCategoryTrendUp when the top category's spend increased", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 5000, percentOfTotal: 60 }];
    const categoryComparison: CategoryComparisonEntry[] = [{ category: "Food", current: 5000, previous: 4000, changePercent: 25 }];
    const parts = generateExecutiveSummary(healthScore(), spending({ topCategories, categoryComparison }), cashFlow(), []);
    expect(parts).toContainEqual({ key: "topCategoryTrendUp", params: { category: "Food", amount: 5000, percent: 25 } });
  });

  it("includes topCategoryTrendDown when the top category's spend decreased", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 3000, percentOfTotal: 60 }];
    const categoryComparison: CategoryComparisonEntry[] = [{ category: "Food", current: 3000, previous: 4000, changePercent: -25 }];
    const parts = generateExecutiveSummary(healthScore(), spending({ topCategories, categoryComparison }), cashFlow(), []);
    expect(parts).toContainEqual({ key: "topCategoryTrendDown", params: { category: "Food", amount: 3000, percent: 25 } });
  });

  it("includes topCategoryTrendFlat when there's no comparison baseline for the top category", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 3000, percentOfTotal: 60 }];
    const parts = generateExecutiveSummary(healthScore(), spending({ topCategories }), cashFlow(), []);
    expect(parts).toContainEqual({ key: "topCategoryTrendFlat", params: { category: "Food", amount: 3000, percent: 0 } });
  });

  it("omits every topCategory part when there are no categories at all", () => {
    const parts = generateExecutiveSummary(healthScore(), spending(), cashFlow(), []);
    expect(parts.some((p) => p.key.startsWith("topCategoryTrend"))).toBe(false);
  });

  it("includes savingRate only when cashFlowAnalysis has a savingRatePercent", () => {
    const withRate = generateExecutiveSummary(healthScore(), spending(), cashFlow({ savingRatePercent: 22.4 }), []);
    expect(withRate).toContainEqual({ key: "savingRate", params: { percent: 22 } });

    const withoutRate = generateExecutiveSummary(healthScore(), spending(), cashFlow({ savingRatePercent: null }), []);
    expect(withoutRate.some((p) => p.key === "savingRate")).toBe(false);
  });

  it("includes topRecommendation's estimated savings only, from the first (highest-savings) recommendation", () => {
    const recommendations = [recommendation({ estimatedMonthlySavings: 900 }), recommendation({ id: "rec-2", estimatedMonthlySavings: 200 })];
    const parts = generateExecutiveSummary(healthScore(), spending(), cashFlow(), recommendations);
    expect(parts).toContainEqual({ key: "topRecommendation", params: { amount: 900 } });
  });

  it("omits topRecommendation when there are no recommendations", () => {
    const parts = generateExecutiveSummary(healthScore(), spending(), cashFlow(), []);
    expect(parts.some((p) => p.key === "topRecommendation")).toBe(false);
  });

  it("includes all 4 parts together when every input has data", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 5000, percentOfTotal: 60 }];
    const parts = generateExecutiveSummary(
      healthScore({ score: 90, grade: "excellent" }),
      spending({ topCategories }),
      cashFlow({ savingRatePercent: 30 }),
      [recommendation({ estimatedMonthlySavings: 400 })]
    );
    expect(parts.map((p) => p.key)).toEqual(["overallHealth", "topCategoryTrendFlat", "savingRate", "topRecommendation"]);
  });
});
