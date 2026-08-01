import { describe, expect, it } from "vitest";
import { calculateBehaviorScores } from "@/features/finance/aiAnalytics/engine/behavior/calculators/behaviorScoreCalculator";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);

function budgetEntry(category: string, status: BudgetAnalysisEntry["status"]): BudgetAnalysisEntry {
  return { budget: { category, amount: 5000, period: "monthly" }, spent: 4000, remaining: 1000, percentage: 80, status, suggestedMonthlyCap: null, potentialMonthlySavings: null };
}

function context(overrides: Partial<BehaviorEngineContext> = {}): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [{ monthKey: "x", income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000 }] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now,
    ...overrides,
  };
}

describe("calculateBehaviorScores", () => {
  it("is entirely null with a brand-new empty profile (zero income, zero expense)", () => {
    const emptyCashFlow = { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] };
    const result = calculateBehaviorScores(context({ cashFlowAnalysis: emptyCashFlow }));
    expect(result).toEqual({ overall: null, restaurant: null, shopping: null, coffee: null, budgetDiscipline: null, impulseControl: null, consistency: null });
  });

  it("gives a perfect impulseControl score when there's real spending but zero impulse purchases", () => {
    const result = calculateBehaviorScores(context());
    expect(result.impulseControl).toBe(100);
  });

  it("scores restaurant highly when eating-out is a small share of expense", () => {
    const flags: BehaviorFlag[] = [{ key: "eatingOut", transactionCount: 3, totalAmount: 300, dataQuality: "full" }]; // 3% of 10000
    const result = calculateBehaviorScores(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));
    expect(result.restaurant).toBeGreaterThan(80);
  });

  it("scores restaurant poorly when eating-out dominates expense", () => {
    const flags: BehaviorFlag[] = [{ key: "eatingOut", transactionCount: 20, totalAmount: 6000, dataQuality: "full" }]; // 60% of 10000
    const result = calculateBehaviorScores(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));
    expect(result.restaurant).toBeLessThan(30);
  });

  it("scores budgetDiscipline only from discretionary-category budgets", () => {
    const entries = [budgetEntry("Food", "ok"), budgetEntry("Rent", "over")]; // Rent isn't discretionary, excluded
    const result = calculateBehaviorScores(context({ budgetAnalysis: { entries, overCount: 1, nearCount: 0, okCount: 1 } }));
    expect(result.budgetDiscipline).toBe(100); // only the Food entry counted, and it's "ok"
  });

  it("is null for shopping without a matching top category", () => {
    const topCategories: TopCategoryEntry[] = [{ category: "Food", amount: 1000, percentOfTotal: 100 }];
    const result = calculateBehaviorScores(context({ spendingAnalysis: { topCategories, categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null } }));
    expect(result.shopping).toBeNull();
  });

  it("averages only the non-null sub-scores into overall", () => {
    const flags: BehaviorFlag[] = [{ key: "eatingOut", transactionCount: 3, totalAmount: 300, dataQuality: "full" }];
    const result = calculateBehaviorScores(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));
    // Only restaurant + impulseControl (always 100) are non-null here.
    expect(result.overall).not.toBeNull();
    expect(result.overall).toBe((result.restaurant! + result.impulseControl!) / 2);
  });

  it("scores consistency from trailing discretionary spend stability", () => {
    const transactions: Transaction[] = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((m) => ({ title: "Restaurant dinner", amount: 500, type: "expense", account: "Cash", date: `${m}-15` }));
    const result = calculateBehaviorScores(context({ transactions }));
    expect(result.consistency).not.toBeNull();
    expect(result.consistency).toBeGreaterThan(90); // perfectly flat spending every month
  });
});
