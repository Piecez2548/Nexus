import { describe, expect, it } from "vitest";
import { calculateBehaviorScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/behaviorScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { BehaviorAnalysisResult, BehaviorFlag, ImpulsePurchaseEntry, SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

const now = new Date(2026, 6, 30);
const thresholds = DEFAULT_SCORE_THRESHOLDS.behavior;

function flag(key: BehaviorFlag["key"], totalAmount: number, transactionCount: number, dataQuality: BehaviorFlag["dataQuality"] = "full"): BehaviorFlag {
  return { key, transactionCount, totalAmount, dataQuality };
}

function monthPoint(monthKey: string, income: number, expense: number): CashFlowMonthPoint {
  return { monthKey, income, expense, saving: income - expense, savingRatePercent: null, netCashFlow: income - expense };
}

function context(behaviorOverrides: Partial<BehaviorAnalysisResult>, monthlyTrend: CashFlowMonthPoint[]): ScoreContext {
  return {
    cashFlowAnalysis: {
      income: monthlyTrend[monthlyTrend.length - 1]?.income ?? 0,
      expense: monthlyTrend[monthlyTrend.length - 1]?.expense ?? 0,
      saving: 0,
      savingRatePercent: null,
      netCashFlow: 0,
      changeVsPreviousMonth: { income: null, expense: null, saving: null },
      monthlyTrend,
    },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: {
      flags: [],
      largePurchases: [],
      topMerchants: [],
      subscriptions: [],
      impulsePurchases: [],
      mostActiveHour: { hour: null, dataQuality: "unavailable" },
      mostActiveWeekday: null,
      ...behaviorOverrides,
    },
    goalProgress: [],
    transactions: [],
    budgets: [],
    now,
  };
}

const threeFlatMonths = [monthPoint("2026-05", 30000, 20000), monthPoint("2026-06", 30000, 20000), monthPoint("2026-07", 30000, 20000)];

describe("calculateBehaviorScore", () => {
  it("is null with no income or expense activity in the recent window", () => {
    const result = calculateBehaviorScore(context({}, []), 10, thresholds);
    expect(result.score).toBeNull();
  });

  it("scores well-controlled discretionary spending highly with positive factors", () => {
    const behavior = { flags: [flag("eatingOut", 500, 3), flag("coffee", 200, 5), flag("weekendSpending", 300, 2), flag("nightSpending", 0, 0, "unavailable" as const)] };
    const result = calculateBehaviorScore(context(behavior, threeFlatMonths), 10, thresholds);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(80);
    expect(result.explanation.negativeFactors).toEqual([]);
  });

  it("flags a high eating-out share as a negative factor with a suggestion", () => {
    const behavior = { flags: [flag("eatingOut", 15000, 20)] };
    const result = calculateBehaviorScore(context(behavior, threeFlatMonths), 10, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("eatingOutHigh"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("adds the discretionary-spending suggestion only once even when several flags are high", () => {
    const behavior = { flags: [flag("eatingOut", 15000, 20), flag("coffee", 10000, 15), flag("weekendSpending", 12000, 10)] };
    const result = calculateBehaviorScore(context(behavior, threeFlatMonths), 10, thresholds);
    const discretionarySuggestions = result.explanation.improvementSuggestions.filter((s) => s.key.includes("reduceDiscretionarySpending"));
    expect(discretionarySuggestions).toHaveLength(1);
  });

  it("excludes night spending from scoring entirely when its data quality is unavailable", () => {
    const behavior = { flags: [flag("nightSpending", 0, 0, "unavailable" as const)] };
    // Should not throw and should not fabricate a night-spending factor either way.
    const result = calculateBehaviorScore(context(behavior, threeFlatMonths), 10, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("night"))).toBe(false);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("night"))).toBe(false);
  });

  it("flags a high share of impulse purchases", () => {
    const impulsePurchases: ImpulsePurchaseEntry[] = Array.from({ length: 5 }, (_, i) => ({ id: i, title: "Impulse", amount: 4000, category: "Shopping", date: "2026-07-10", reason: "aboveAverageNoBudget" }));
    const result = calculateBehaviorScore(context({ impulsePurchases }, threeFlatMonths), 10, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("impulsePurchases"))).toBe(true);
  });

  it("flags subscriptions consuming a high share of income", () => {
    const subscriptions: SubscriptionEntry[] = [
      { normalizedTitle: "netflix", representativeTitle: "Netflix", category: "Entertainment", averageAmount: 5000, occurrenceCount: 3, lastDate: "2026-07-01", averageIntervalDays: 30, lastAmount: 5000, previousAmount: 5000 },
      { normalizedTitle: "gym", representativeTitle: "Gym", category: "Health", averageAmount: 5000, occurrenceCount: 3, lastDate: "2026-07-01", averageIntervalDays: 30, lastAmount: 5000, previousAmount: 5000 },
    ];
    const result = calculateBehaviorScore(context({ subscriptions }, threeFlatMonths), 10, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("subscriptionsHigh"))).toBe(true);
  });

  it("treats a small subscription cost as a positive factor", () => {
    const subscriptions: SubscriptionEntry[] = [
      { normalizedTitle: "netflix", representativeTitle: "Netflix", category: "Entertainment", averageAmount: 300, occurrenceCount: 3, lastDate: "2026-07-01", averageIntervalDays: 30, lastAmount: 300, previousAmount: 300 },
    ];
    const result = calculateBehaviorScore(context({ subscriptions }, threeFlatMonths), 10, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("subscriptionsControlled"))).toBe(true);
  });
});
