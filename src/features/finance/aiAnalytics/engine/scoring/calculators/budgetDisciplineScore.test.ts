import { describe, expect, it } from "vitest";
import { calculateBudgetDisciplineScore } from "@/features/finance/aiAnalytics/engine/scoring/calculators/budgetDisciplineScore";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreContext } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);
const thresholds = DEFAULT_SCORE_THRESHOLDS.budgetDiscipline;

function entry(category: string, amount: number, spent: number): BudgetAnalysisEntry {
  const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  const status = spent >= amount ? "over" : spent / amount >= 0.8 ? "near" : "ok";
  return {
    budget: { category, amount, period: "monthly" },
    spent,
    remaining: amount - spent,
    percentage,
    status,
    suggestedMonthlyCap: status === "over" ? amount : null,
    potentialMonthlySavings: status === "over" ? spent - amount : null,
  };
}

function context(entries: BudgetAnalysisEntry[], transactions: Transaction[] = []): ScoreContext {
  return {
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries, overCount: entries.filter((e) => e.status === "over").length, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    transactionStatistics: { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    goalProgress: [],
    transactions,
    budgets: entries.map((e) => e.budget),
    now,
  };
}

function expenseTx(date: string, amount: number, category: string): Transaction {
  return { title: "Test", amount, type: "expense", account: "Cash", date, category };
}

describe("calculateBudgetDisciplineScore", () => {
  it("is null with no budgets", () => {
    expect(calculateBudgetDisciplineScore(context([]), 20, thresholds).score).toBeNull();
  });

  it("scores full compliance highly with a positive factor and no negatives", () => {
    const result = calculateBudgetDisciplineScore(context([entry("Food", 5000, 3000), entry("Transport", 2000, 1000)]), 20, thresholds);
    expect(result.score).toBe(100);
    expect(result.explanation.positiveFactors.some((f) => f.key.includes("fullCompliance"))).toBe(true);
    expect(result.explanation.negativeFactors).toEqual([]);
  });

  it("flags over-budget categories as a negative factor with a suggestion", () => {
    const result = calculateBudgetDisciplineScore(context([entry("Food", 5000, 6000)]), 20, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("overBudget"))).toBe(true);
    expect(result.explanation.improvementSuggestions.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("flags a category over budget for 2+ consecutive months as repeated overspending", () => {
    const transactions = ["2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15", "2026-07-15"].map((d) => expenseTx(d, 6000, "Food"));
    const result = calculateBudgetDisciplineScore(context([entry("Food", 5000, 6000)], transactions), 20, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("repeatedOverspend"))).toBe(true);
  });

  it("does not flag repeated overspending for a one-off overage with no history of it", () => {
    const transactions = [expenseTx("2026-07-15", 6000, "Food")];
    const result = calculateBudgetDisciplineScore(context([entry("Food", 5000, 6000)], transactions), 20, thresholds);
    expect(result.explanation.negativeFactors.some((f) => f.key.includes("repeatedOverspend"))).toBe(false);
  });
});
