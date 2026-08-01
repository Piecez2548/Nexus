import { describe, expect, it } from "vitest";
import { computeFinancialHealthScore } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/computeFinancialHealthScore";
import { DEFAULT_SCORE_WEIGHTS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);
const monthKeys = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

function emptyContext(): ScoreContext {
  const zeroMonths: CashFlowMonthPoint[] = monthKeys.map((monthKey) => ({ monthKey, income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0 }));
  return {
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: zeroMonths },
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

function healthyContext(): ScoreContext {
  const flatMonths: CashFlowMonthPoint[] = monthKeys.map((monthKey) => ({ monthKey, income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000 }));
  const transactions: Transaction[] = monthKeys.map((m) => ({ title: "Salary", amount: 30000, type: "income", account: "Bank", date: `${m}-15` }));

  return {
    cashFlowAnalysis: { income: 30000, expense: 10000, saving: 20000, savingRatePercent: 35, netCashFlow: 20000, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: flatMonths },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 500, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress: [],
    transactions,
    budgets: [],
    now,
  };
}

describe("computeFinancialHealthScore", () => {
  it("reports insufficientData with a null overall score, grade, and status on a brand-new profile", () => {
    const result = computeFinancialHealthScore(emptyContext());
    expect(result.insufficientData).toBe(true);
    expect(result.overallScore).toBeNull();
    expect(result.grade).toBeNull();
    expect(result.status).toBeNull();
    expect(result.categoryScores).toHaveLength(7);
  });

  it("renormalizes the weighted average over only the categories with a score (no budgets, no goals)", () => {
    const result = computeFinancialHealthScore(healthyContext());

    const budgetDiscipline = result.categoryScores.find((c) => c.category === "budgetDiscipline");
    const goalProgress = result.categoryScores.find((c) => c.category === "goalProgress");
    expect(budgetDiscipline?.score).toBeNull();
    expect(goalProgress?.score).toBeNull();

    // savingRate(100*25) + expenseControl(100*15) + cashFlow(100*15) + incomeStability(~83.33*10) + behavior(100*10), over weight 75.
    expect(result.insufficientData).toBe(false);
    expect(result.overallScore).not.toBeNull();
    expect(result.overallScore!).toBeGreaterThan(95);
    expect(result.grade).toBe("A+");
    expect(result.status).toBe("excellent");
  });

  it("carries each category's configured weight through to categoryScores", () => {
    const result = computeFinancialHealthScore(healthyContext());
    const savingRate = result.categoryScores.find((c) => c.category === "savingRate");
    expect(savingRate?.weight).toBe(DEFAULT_SCORE_WEIGHTS.savingRate);
  });

  it("aggregates strengths from high-scoring categories' positive factors", () => {
    const result = computeFinancialHealthScore(healthyContext());
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("respects a custom weight override", () => {
    const heavySavingRate = computeFinancialHealthScore(healthyContext(), { weights: { ...DEFAULT_SCORE_WEIGHTS, savingRate: 90 } });
    const savingRate = heavySavingRate.categoryScores.find((c) => c.category === "savingRate");
    expect(savingRate?.weight).toBe(90);
  });
});
