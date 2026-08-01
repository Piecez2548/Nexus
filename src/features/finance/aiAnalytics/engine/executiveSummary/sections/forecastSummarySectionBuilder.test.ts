import { describe, expect, it } from "vitest";
import { buildForecastSummarySection } from "./forecastSummarySectionBuilder";
import type { ForecastEngineResult, GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";

function periodForecast() {
  return {
    period: "monthly" as const,
    rangeStart: "2026-07-01",
    rangeEnd: "2026-08-01",
    incomeSoFar: 0,
    expenseSoFar: 0,
    expectedIncome: 0,
    expectedExpense: 0,
    remainingExpectedExpense: 0,
    expectedSavings: 0,
    expectedEndOfPeriodBalance: 0,
    cashFlowStabilityScore: 65,
    confidence: 50,
    basis: "linearProjection" as const,
  };
}

function goalForecastEntry(overrides: Partial<GoalForecastEntry> & { goal: GoalForecastEntry["goal"] }): GoalForecastEntry {
  return { paceKnown: false, monthlyProgressAmount: null, expectedCompletionDate: null, requiredMonthlyContribution: null, probabilityOfCompletion: null, projectedDelayDays: null, ...overrides };
}

function forecastProfile(overrides: Partial<ForecastEngineResult> = {}): ForecastEngineResult {
  return {
    summary: { expectedEndOfMonthBalance: 5000, expectedSavings: 2000, overallConfidence: 60, topAlert: null },
    details: {
      monthlyForecast: periodForecast(),
      weeklyForecast: { ...periodForecast(), period: "weekly", expectedEndOfPeriodBalance: null },
      yearlyForecast: { ...periodForecast(), period: "yearly" },
      budgetForecast: { entries: [], categoriesLikelyToExceed: [], categoriesLikelyToRemainUnder: [], confidence: 55 },
      savingsForecast: { expectedMonthlySavings: 2000, savingRatePercent: 20, bestCaseMonthlySavings: null, worstCaseMonthlySavings: null, goalTimelines: [], confidence: 55 },
      goalForecast: [],
    },
    confidence: 58,
    supportingMetrics: { monthsOfHistory: 3, transactionCount: 20, insufficientData: false },
    alerts: [],
    trendAnalysis: {
      category: { entries: [], fastestGrowingCategory: null, fastestDecliningCategory: null, stableCategories: [] },
      merchant: { mostVisited: [], growingMerchants: [], decliningMerchants: [], spendingConcentrationPercent: null },
      behavior: { entries: [] },
    },
    ...overrides,
  };
}

describe("buildForecastSummarySection", () => {
  it("selects expectedEndOfMonthBalance/expectedSavings from summary, and confidence from the top-level field", () => {
    const result = buildForecastSummarySection(forecastProfile());
    expect(result.expectedEndOfMonthBalance).toBe(5000);
    expect(result.expectedSavings).toBe(2000);
    expect(result.confidence).toBe(58);
  });

  it("selects budget-risk category lists from details.budgetForecast", () => {
    const profile = forecastProfile({
      details: { ...forecastProfile().details, budgetForecast: { entries: [], categoriesLikelyToExceed: ["Food"], categoriesLikelyToRemainUnder: ["Transport"], confidence: 55 } },
    });
    const result = buildForecastSummarySection(profile);
    expect(result.categoriesLikelyToExceed).toEqual(["Food"]);
    expect(result.categoriesLikelyToRemainUnder).toEqual(["Transport"]);
  });

  it("collects goalsAtRisk from goals with a positive projectedDelayDays", () => {
    const goalForecast = [
      goalForecastEntry({ goal: { name: "On Track", targetAmount: 1000, currentAmount: 500 }, projectedDelayDays: null }),
      goalForecastEntry({ goal: { name: "Delayed", targetAmount: 1000, currentAmount: 500 }, projectedDelayDays: 30 }),
      goalForecastEntry({ goal: { name: "Early", targetAmount: 1000, currentAmount: 500 }, projectedDelayDays: -5 }),
    ];
    const profile = forecastProfile({ details: { ...forecastProfile().details, goalForecast } });
    const result = buildForecastSummarySection(profile);
    expect(result.goalsAtRisk).toEqual(["Delayed"]);
  });

  it("reads cashFlowStabilityScore from the monthly forecast", () => {
    const result = buildForecastSummarySection(forecastProfile());
    expect(result.cashFlowStabilityScore).toBe(65);
  });
});
