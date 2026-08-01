import { describe, expect, it } from "vitest";
import { calculateIncomeStabilityScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/incomeStabilityScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30); // 2026-07-30 — 6-month window spans Feb-Jul 2026
const thresholds = DEFAULT_SCORE_THRESHOLDS.incomeStability;

function incomeTx(date: string, amount: number): Transaction {
  return { title: "Salary", amount, type: "income", account: "Bank", date };
}

function context(transactions: Transaction[]): ScoreContext {
  return {
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress: [],
    transactions,
    budgets: [],
    now,
  };
}

describe("calculateIncomeStabilityScore", () => {
  it("is null with no income anywhere in the window", () => {
    const result = calculateIncomeStabilityScore(context([]), 10, thresholds);
    expect(result.score).toBeNull();
  });

  it("scores a flat, perfectly regular income highly with a 'regular' positive factor and no negative factors", () => {
    const transactions = ["2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15", "2026-07-15"].map((d) => incomeTx(d, 30000));
    const result = calculateIncomeStabilityScore(context(transactions), 10, thresholds);

    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(80);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("regular"))).toBe(true);
    expect(result.explanation.negativeFactors).toEqual([]);
  });

  it("flags irregular income (fewer than half the months) as a negative factor", () => {
    const transactions = ["2026-06-15", "2026-07-15"].map((d) => incomeTx(d, 30000));
    const result = calculateIncomeStabilityScore(context(transactions), 10, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("irregular"))).toBe(true);
  });

  it("flags highly volatile month-to-month income as a negative factor with a suggestion", () => {
    const amounts = [5000, 50000, 3000, 60000, 2000, 55000];
    const dates = ["2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15", "2026-07-15"];
    const transactions = dates.map((d, i) => incomeTx(d, amounts[i]));
    const result = calculateIncomeStabilityScore(context(transactions), 10, thresholds);

    expect(result.explanation.negativeFactors.some((f) => f.key.includes("volatile"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("flags growing income as a positive factor", () => {
    const amounts = [10000, 15000, 20000, 25000, 30000, 35000];
    const dates = ["2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15", "2026-07-15"];
    const transactions = dates.map((d, i) => incomeTx(d, amounts[i]));
    const result = calculateIncomeStabilityScore(context(transactions), 10, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("growing"))).toBe(true);
  });

  it("flags declining income as a negative factor", () => {
    const amounts = [35000, 30000, 25000, 20000, 15000, 10000];
    const dates = ["2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15", "2026-07-15"];
    const transactions = dates.map((d, i) => incomeTx(d, amounts[i]));
    const result = calculateIncomeStabilityScore(context(transactions), 10, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("declining"))).toBe(true);
  });
});
