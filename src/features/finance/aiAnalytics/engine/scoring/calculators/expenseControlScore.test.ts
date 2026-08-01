import { describe, expect, it } from "vitest";
import { calculateExpenseControlScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/expenseControlScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { TransactionExtreme } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";
import type { ImpulsePurchaseEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

const now = new Date(2026, 6, 30);
const thresholds = DEFAULT_SCORE_THRESHOLDS.expenseControl;

function context(overrides: {
  income?: number;
  expense?: number;
  topCategories?: TopCategoryEntry[];
  largestTransaction?: TransactionExtreme | null;
  averageTransaction?: number;
  impulsePurchases?: ImpulsePurchaseEntry[];
}): ScoreContext {
  const income = overrides.income ?? 30000;
  const expense = overrides.expense ?? 10000;
  return {
    cashFlowAnalysis: { income, expense, saving: income - expense, savingRatePercent: null, netCashFlow: income - expense, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: overrides.topCategories ?? [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: {
      averageDailySpending: 0,
      averageWeeklySpending: 0,
      averageMonthlySpending: 0,
      averageTransaction: overrides.averageTransaction ?? 500,
      largestTransaction: overrides.largestTransaction ?? null,
      smallestTransaction: null,
    },
    behaviorAnalysis: {
      flags: [],
      largePurchases: [],
      topMerchants: [],
      subscriptions: [],
      impulsePurchases: overrides.impulsePurchases ?? [],
      mostActiveHour: { hour: null, dataQuality: "unavailable" },
      mostActiveWeekday: null,
    },
    goalProgress: [],
    transactions: [],
    budgets: [],
    now,
  };
}

describe("calculateExpenseControlScore", () => {
  it("is null with no expense this period", () => {
    expect(calculateExpenseControlScore(context({ expense: 0 }), 15, thresholds).score).toBeNull();
  });

  it("scores a healthy, unconcentrated, impulse-free profile highly", () => {
    const result = calculateExpenseControlScore(context({ income: 30000, expense: 10000 }), 15, thresholds);
    expect(result.score).toBeGreaterThan(80);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("lowExpenseRatio"))).toBe(true);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("noImpulsePurchases"))).toBe(true);
  });

  it("flags a high expense ratio as a negative factor with a suggestion", () => {
    const result = calculateExpenseControlScore(context({ income: 10000, expense: 11000 }), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("highExpenseRatio"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("flags a dominant top category as concentration risk", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 8000, percentOfTotal: 80 }];
    const result = calculateExpenseControlScore(context({ topCategories }), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("categoryConcentration"))).toBe(true);
  });

  it("flags a purchase far above the average as a large purchase", () => {
    const result = calculateExpenseControlScore(context({ averageTransaction: 500, largestTransaction: { id: 1, title: "TV", amount: 10000, category: "Shopping", date: "2026-07-10" } }), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("largePurchase"))).toBe(true);
  });

  it("flags a high share of impulse purchases as unnecessary spending", () => {
    const impulsePurchases: ImpulsePurchaseEntry[] = [{ id: 1, title: "Gadget", amount: 3000, category: "Shopping", date: "2026-07-10", reason: "aboveAverageNoBudget" }];
    const result = calculateExpenseControlScore(context({ expense: 10000, impulsePurchases }), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("unnecessarySpending"))).toBe(true);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("noImpulsePurchases"))).toBe(false);
  });
});
