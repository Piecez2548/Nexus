import { describe, expect, it } from "vitest";
import { calculateGoalProgressScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/goalProgressScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";

const now = new Date(2026, 6, 30);
const thresholds = DEFAULT_SCORE_THRESHOLDS.goalProgress;

function goalEntry(overrides: Partial<GoalProgressEntry> = {}): GoalProgressEntry {
  return {
    goal: { name: "Emergency Fund", targetAmount: 100000, currentAmount: 50000 },
    progressPercent: 50,
    isComplete: false,
    daysRemaining: null,
    isDeadlinePassedIncomplete: false,
    milestonesCrossedThisMonth: 0,
    ...overrides,
  };
}

function context(goalProgress: GoalProgressEntry[]): ScoreContext {
  return {
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress,
    transactions: [],
    budgets: [],
    now,
  };
}

describe("calculateGoalProgressScore", () => {
  it("is null with no goals — absence isn't penalized", () => {
    expect(calculateGoalProgressScore(context([]), 5, thresholds).score).toBeNull();
  });

  it("gives a positive factor for completed goals", () => {
    const result = calculateGoalProgressScore(context([goalEntry({ isComplete: true, progressPercent: 100 })]), 5, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("goalsCompleted"))).toBe(true);
  });

  it("gives a positive factor for a goal near completion", () => {
    const result = calculateGoalProgressScore(context([goalEntry({ progressPercent: 95 })]), 5, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("nearComplete"))).toBe(true);
  });

  it("gives a positive factor when a milestone was crossed this month", () => {
    const result = calculateGoalProgressScore(context([goalEntry({ milestonesCrossedThisMonth: 1 })]), 5, thresholds);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("activeProgress"))).toBe(true);
  });

  it("flags an overdue, incomplete goal as a negative factor with a suggestion", () => {
    const result = calculateGoalProgressScore(context([goalEntry({ isDeadlinePassedIncomplete: true })]), 5, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("overdueGoals"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(75);
  });

  it("flags broadly low progress across goals as a negative factor", () => {
    const result = calculateGoalProgressScore(context([goalEntry({ progressPercent: 5 }), goalEntry({ progressPercent: 10 })]), 5, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("lowProgress"))).toBe(true);
  });
});
