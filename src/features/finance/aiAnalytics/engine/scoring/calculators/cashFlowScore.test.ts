import { describe, expect, it } from "vitest";
import { calculateCashFlowScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/cashFlowScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

const now = new Date(2026, 6, 30);
const thresholds = DEFAULT_SCORE_THRESHOLDS.cashFlow;

function monthPoint(monthKey: string, netCashFlow: number): CashFlowMonthPoint {
  return { monthKey, income: Math.max(netCashFlow, 0) + 10000, expense: 10000, saving: netCashFlow, savingRatePercent: null, netCashFlow };
}

function context(netCashFlow: number, expense: number, monthlyTrend: CashFlowMonthPoint[]): ScoreContext {
  return {
    cashFlowAnalysis: { income: expense + netCashFlow, expense, saving: netCashFlow, savingRatePercent: null, netCashFlow, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress: [],
    transactions: [],
    budgets: [],
    now,
  };
}

describe("calculateCashFlowScore", () => {
  it("is null when every month in the window has zero income and zero expense", () => {
    const monthlyTrend: CashFlowMonthPoint[] = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((monthKey) => ({
      monthKey,
      income: 0,
      expense: 0,
      saving: 0,
      savingRatePercent: null,
      netCashFlow: 0,
    }));
    const result = calculateCashFlowScore(context(0, 0, monthlyTrend), 15, thresholds);
    expect(result.score).toBeNull();
  });

  it("scores stable, consistently positive cash flow highly with positive factors and no negatives", () => {
    const monthlyTrend = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((m) => monthPoint(m, 5000));
    const result = calculateCashFlowScore(context(5000, 10000, monthlyTrend), 15, thresholds);

    expect(result.score).toBe(100);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("positiveCashFlow"))).toBe(true);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("consistentlyPositive"))).toBe(true);
    expect(result.explanation.negativeFactors).toEqual([]);
  });

  it("flags a negative cash flow month with a suggestion", () => {
    const monthlyTrend = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((m) => monthPoint(m, 5000));
    monthlyTrend[monthlyTrend.length - 1] = monthPoint("2026-07", -2000);
    const result = calculateCashFlowScore(context(-2000, 10000, monthlyTrend), 15, thresholds);

    expect(result.explanation.negativeFactors.some((f) => f.key.includes("negativeCashFlow"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("flags frequent negative months as a negative factor", () => {
    const monthlyTrend = [monthPoint("2026-02", -1000), monthPoint("2026-03", -1000), monthPoint("2026-04", -1000), monthPoint("2026-05", 5000), monthPoint("2026-06", 5000), monthPoint("2026-07", -1000)];
    const result = calculateCashFlowScore(context(-1000, 10000, monthlyTrend), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("frequentlyNegative"))).toBe(true);
  });

  it("flags volatile month-to-month cash flow as unstable", () => {
    const values = [20000, -15000, 18000, -20000, 22000, -18000];
    const monthlyTrend = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((m, i) => monthPoint(m, values[i]));
    const result = calculateCashFlowScore(context(values[values.length - 1], 10000, monthlyTrend), 15, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("unstable"))).toBe(true);
  });
});
