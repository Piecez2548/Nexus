import { describe, expect, it } from "vitest";
import { calculateSavingRateScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/savingRateScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";

function context(savingRatePercent: number | null): ScoreContext {
  return {
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress: [],
    transactions: [],
    budgets: [],
    now: new Date(2026, 6, 30),
  };
}

const thresholds = DEFAULT_SCORE_THRESHOLDS.savingRate;

describe("calculateSavingRateScore", () => {
  it("is null with no positive factors when there's no income to compute a rate from", () => {
    const result = calculateSavingRateScore(context(null), 25, thresholds);
    expect(result.score).toBeNull();
    expect(result.explanation.positiveFactors).toEqual([]);
  });

  it.each([
    [35, 100],
    [30, 100],
    [25, 85],
    [20, 85],
    [15, 60],
    [10, 60],
    [5, 25],
    [-10, 25],
  ])("scores %i%% saving rate as %i", (percent, expectedScore) => {
    expect(calculateSavingRateScore(context(percent), 25, thresholds).score).toBe(expectedScore);
  });

  it("reports a positive factor at the top band and a negative factor + suggestion at the bottom band", () => {
    const strong = calculateSavingRateScore(context(35), 25, thresholds);
    expect(strong.explanation.positiveFactors).toHaveLength(1);
    expect(strong.explanation.negativeFactors).toEqual([]);

    const weak = calculateSavingRateScore(context(2), 25, thresholds);
    expect(weak.explanation.negativeFactors).toHaveLength(1);
    expect(weak.explanation.improvementSuggestions).toHaveLength(1);
  });

  it("carries the configured weight through unchanged", () => {
    expect(calculateSavingRateScore(context(35), 25, thresholds).weight).toBe(25);
  });
});
