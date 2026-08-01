import { describe, expect, it } from "vitest";
import { estimateSavingsForecast } from "./savingsForecastEstimator";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { MonthlyForecast } from "@/features/finance/aiAnalytics/engine/forecast/types";

function monthlyForecast(overrides: Partial<MonthlyForecast> = {}): MonthlyForecast {
  return {
    period: "monthly",
    rangeStart: "2026-07-01",
    rangeEnd: "2026-08-01",
    incomeSoFar: 0,
    expenseSoFar: 0,
    expectedIncome: 10000,
    expectedExpense: 6000,
    remainingExpectedExpense: 0,
    expectedSavings: 4000,
    expectedEndOfPeriodBalance: 4000,
    cashFlowStabilityScore: 70,
    confidence: 60,
    basis: "linearProjection",
    ...overrides,
  };
}

function monthPoint(overrides: Partial<CashFlowMonthPoint>): CashFlowMonthPoint {
  return { monthKey: "2026-01", income: 10000, expense: 6000, saving: 4000, savingRatePercent: 40, netCashFlow: 4000, ...overrides };
}

describe("estimateSavingsForecast", () => {
  it("passes expectedMonthlySavings through from the monthly forecast, never recomputing it", () => {
    const result = estimateSavingsForecast(monthlyForecast({ expectedSavings: 4000, expectedIncome: 10000 }), [], [], 3, false);
    expect(result.expectedMonthlySavings).toBe(4000);
    expect(result.savingRatePercent).toBe(40);
  });

  it("saving rate is null when expected income is zero", () => {
    const result = estimateSavingsForecast(monthlyForecast({ expectedIncome: 0, expectedSavings: 0 }), [], [], 3, false);
    expect(result.savingRatePercent).toBeNull();
  });

  it("best/worst case are the real historical extremes, not a modeled range", () => {
    const trend = [monthPoint({ netCashFlow: 1000 }), monthPoint({ netCashFlow: -500 }), monthPoint({ netCashFlow: 3000 })];
    const result = estimateSavingsForecast(monthlyForecast(), trend, [], 3, false);
    expect(result.bestCaseMonthlySavings).toBe(3000);
    expect(result.worstCaseMonthlySavings).toBe(-500);
  });

  it("best/worst case are null with fewer than 2 active months", () => {
    const trend = [monthPoint({ netCashFlow: 1000 })];
    const result = estimateSavingsForecast(monthlyForecast(), trend, [], 3, false);
    expect(result.bestCaseMonthlySavings).toBeNull();
    expect(result.worstCaseMonthlySavings).toBeNull();
  });

  it("computes a per-goal timeline only for incomplete goals", () => {
    const goalProgress: GoalProgressEntry[] = [
      { goal: { name: "Vacation", targetAmount: 20000, currentAmount: 4000 }, progressPercent: 20, isComplete: false, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 },
      { goal: { name: "Emergency Fund", targetAmount: 5000, currentAmount: 5000 }, progressPercent: 100, isComplete: true, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 },
    ];

    const result = estimateSavingsForecast(monthlyForecast({ expectedSavings: 4000 }), [], goalProgress, 3, false);

    expect(result.goalTimelines).toHaveLength(1);
    expect(result.goalTimelines[0].goalName).toBe("Vacation");
    expect(result.goalTimelines[0].monthsToReachAtCurrentPace).toBeCloseTo((20000 - 4000) / 4000, 5);
  });

  it("goal timeline pace is null when expected monthly savings is not positive", () => {
    const goalProgress: GoalProgressEntry[] = [
      { goal: { name: "Vacation", targetAmount: 20000, currentAmount: 4000 }, progressPercent: 20, isComplete: false, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 },
    ];
    const result = estimateSavingsForecast(monthlyForecast({ expectedSavings: 0 }), [], goalProgress, 3, false);
    expect(result.goalTimelines[0].monthsToReachAtCurrentPace).toBeNull();
  });
});
