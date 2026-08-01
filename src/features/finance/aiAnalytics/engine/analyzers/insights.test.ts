import { describe, expect, it } from "vitest";
import { generateInsights } from "./insights";
import type { BudgetAnalysisResult } from "./budgetAnalysis";
import type { CashFlowAnalysisResult } from "./cashFlowAnalysis";
import type { SpendingAnalysisResult } from "./spendingAnalysis";
import type { BehaviorAnalysisResult } from "./behaviorAnalysis";
import type { ForecastResult } from "./forecast";

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

function budgets(overrides: Partial<BudgetAnalysisResult> = {}): BudgetAnalysisResult {
  return { entries: [], overCount: 0, nearCount: 0, okCount: 0, ...overrides };
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

function forecast(overrides: Partial<ForecastResult> = {}): ForecastResult {
  return {
    expectedEndOfMonthBalance: 0,
    expectedSavings: 0,
    budgetOverflowRisk: [],
    futureCashFlowTrend: { basis: "insufficientData", projectedMonthlyNet: null },
    ...overrides,
  };
}

// Full weekdayAnalysis array (all 7 days present, zeroed) so tests can
// override just the days they care about, matching computeWeekdayAnalysis's
// real always-7-entries shape.
function weekdays(overrides: Partial<Record<number, { total: number; count: number }>> = {}) {
  return Array.from({ length: 7 }, (_, weekday) => {
    const o = overrides[weekday];
    return { weekday, total: o?.total ?? 0, count: o?.count ?? 0, average: o && o.count > 0 ? o.total / o.count : 0 };
  });
}

describe("generateInsights", () => {
  it("always includes a cashFlowSummary insight", () => {
    const insights = generateInsights(spending(), budgets(), cashFlow(), behavior(), forecast());
    expect(insights.some((i) => i.key === "cashFlowSummary")).toBe(true);
  });

  it("emits highestSpendingCategory from the top category", () => {
    const insights = generateInsights(
      spending({ topCategories: [{ category: "Food", amount: 1000, percentOfTotal: 60 }] }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    const insight = insights.find((i) => i.key === "highestSpendingCategory");
    expect(insight?.params).toMatchObject({ category: "Food", amount: 1000, percent: 60 });
  });

  it("emits fastestGrowingCategory only for a category with a real previous baseline", () => {
    const insights = generateInsights(
      spending({
        categoryComparison: [
          { category: "New", current: 500, previous: 0, changePercent: null },
          { category: "Food", current: 1200, previous: 1000, changePercent: 20 },
        ],
      }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    const insight = insights.find((i) => i.key === "fastestGrowingCategory");
    expect(insight?.params.category).toBe("Food");
    expect(insight?.severity).toBe("warning"); // 20% >= 15% threshold
  });

  it("does not emit fastestGrowingCategory when nothing grew", () => {
    const insights = generateInsights(
      spending({ categoryComparison: [{ category: "Food", current: 500, previous: 1000, changePercent: -50 }] }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    expect(insights.some((i) => i.key === "fastestGrowingCategory")).toBe(false);
  });

  it("emits one budgetExceeded insight per over-budget entry", () => {
    const insights = generateInsights(
      spending(),
      budgets({
        entries: [
          { budget: { id: 1, category: "Food", amount: 500, period: "monthly" }, spent: 600, remaining: -100, percentage: 100, status: "over", suggestedMonthlyCap: 500, potentialMonthlySavings: 100 },
          { budget: { id: 2, category: "Transport", amount: 500, period: "monthly" }, spent: 300, remaining: 200, percentage: 60, status: "ok", suggestedMonthlyCap: null, potentialMonthlySavings: null },
        ],
      }),
      cashFlow(),
      behavior(),
      forecast()
    );
    const exceeded = insights.filter((i) => i.key === "budgetExceeded");
    expect(exceeded).toHaveLength(1);
    expect(exceeded[0].params.category).toBe("Food");
  });

  it("emits spendingTrend and savingsTrend with direction based on sign", () => {
    const insights = generateInsights(
      spending(),
      budgets(),
      cashFlow({ changeVsPreviousMonth: { income: null, expense: 30, saving: -40 } }),
      behavior(),
      forecast()
    );
    const spendingTrend = insights.find((i) => i.key === "spendingTrend");
    const savingsTrend = insights.find((i) => i.key === "savingsTrend");
    expect(spendingTrend?.params).toMatchObject({ percent: 30, direction: "up" });
    expect(spendingTrend?.severity).toBe("warning");
    expect(savingsTrend?.params).toMatchObject({ percent: 40, direction: "down" });
    expect(savingsTrend?.severity).toBe("warning");
  });

  it("omits spendingTrend/savingsTrend when there's no previous-period baseline", () => {
    const insights = generateInsights(spending(), budgets(), cashFlow(), behavior(), forecast());
    expect(insights.some((i) => i.key === "spendingTrend")).toBe(false);
    expect(insights.some((i) => i.key === "savingsTrend")).toBe(false);
  });

  it("marks cashFlowSummary as warning when net cash flow is negative", () => {
    const insights = generateInsights(spending(), budgets(), cashFlow({ netCashFlow: -500 }), behavior(), forecast());
    const summary = insights.find((i) => i.key === "cashFlowSummary");
    expect(summary?.severity).toBe("warning");
  });

  it("emits largestTransaction from the first large purchase", () => {
    const insights = generateInsights(
      spending(),
      budgets(),
      cashFlow(),
      behavior({ largePurchases: [{ id: 1, title: "New laptop", amount: 35000, category: "Shopping", date: "2026-07-08" }] }),
      forecast()
    );
    const insight = insights.find((i) => i.key === "largestTransaction");
    expect(insight?.params).toMatchObject({ title: "New laptop", amount: 35000 });
  });

  it("omits largestTransaction when there are no large purchases", () => {
    const insights = generateInsights(spending(), budgets(), cashFlow(), behavior(), forecast());
    expect(insights.some((i) => i.key === "largestTransaction")).toBe(false);
  });

  it("emits highestSpendingDay from spendingAnalysis's precomputed field", () => {
    const insights = generateInsights(
      spending({ highestSpendingDay: { date: "2026-07-06", amount: 900 } }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    const insight = insights.find((i) => i.key === "highestSpendingDay");
    expect(insight?.params).toMatchObject({ date: "2026-07-06", amount: 900 });
  });

  it("emits mostExpensiveWeek from spendingAnalysis's precomputed field", () => {
    const insights = generateInsights(
      spending({ mostExpensiveWeek: { weekStart: "2026-06-29", amount: 900 } }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    const insight = insights.find((i) => i.key === "mostExpensiveWeek");
    expect(insight?.params).toMatchObject({ weekStart: "2026-06-29", amount: 900 });
  });

  it("emits one upcomingBudgetRisk insight per forecast risk entry", () => {
    const insights = generateInsights(
      spending(),
      budgets(),
      cashFlow(),
      behavior(),
      forecast({ budgetOverflowRisk: [{ category: "Food", projectedSpend: 600, projectedPercentage: 120 }] })
    );
    const insight = insights.find((i) => i.key === "upcomingBudgetRisk");
    expect(insight?.params).toMatchObject({ category: "Food", percent: 120 });
    expect(insight?.severity).toBe("warning");
  });

  it("emits weekendOverspending when the weekend per-day average exceeds the weekday average", () => {
    const insights = generateInsights(
      spending({ weekdayAnalysis: weekdays({ 0: { total: 1000, count: 2 }, 1: { total: 500, count: 5 } }) }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    const insight = insights.find((i) => i.key === "weekendOverspending");
    expect(insight?.params).toMatchObject({ weekendAverage: 500, weekdayAverage: 100 });
  });

  it("does not emit weekendOverspending when the weekend average is at or below the weekday average", () => {
    const insights = generateInsights(
      spending({ weekdayAnalysis: weekdays({ 0: { total: 200, count: 2 }, 1: { total: 500, count: 5 } }) }),
      budgets(),
      cashFlow(),
      behavior(),
      forecast()
    );
    expect(insights.some((i) => i.key === "weekendOverspending")).toBe(false);
  });
});
