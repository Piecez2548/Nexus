import { describe, expect, it } from "vitest";
import { analyzeBehaviorProfile } from "@/features/finance/aiAnalytics/engine/behavior/engine/analyzeBehaviorProfile";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const now = new Date(2026, 6, 30);

function actionableRec(category: ActionableRecommendation["category"]): ActionableRecommendation {
  return {
    id: `rec-${category}`,
    priority: "medium",
    category,
    title: { key: "t", params: {} },
    summary: { key: "s", params: {} },
    description: { key: "d", params: {} },
    reason: { key: "r", params: {} },
    supportingMetrics: {},
    confidence: 60,
    estimatedMonthlySavings: 100,
    estimatedAnnualSavings: 1200,
    estimatedFinancialImpact: { monthlySavings: 100, annualSavings: 1200, budgetImprovementPercent: null, savingRateImprovementPercent: null },
    difficulty: "easy",
    expectedCompletionTime: "immediate",
    suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
    relatedRules: ["someRule"],
    createdTime: now.toISOString(),
  };
}

function context(overrides: Partial<BehaviorEngineContext> = {}): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
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

describe("analyzeBehaviorProfile", () => {
  it("produces a fully-shaped, empty result for a brand-new profile", () => {
    const result = analyzeBehaviorProfile(context());
    expect(result.detectedHabits).toEqual([]);
    expect(result.positiveHabits).toEqual([]);
    expect(result.negativeHabits).toEqual([]);
    expect(result.profile.spendingStyle.primaryStyle).toBeNull();
    expect(result.confidence).toBe(30); // insufficientData path
  });

  it("passes the existing timeline through unfiltered", () => {
    const timeline = [{ id: "t1", type: "salaryReceived" as const, date: "2026-07-01", params: {} }];
    const result = analyzeBehaviorProfile(context({ timeline }));
    expect(result.timeline).toBe(timeline);
  });

  it("filters actionableRecommendations down to behavior-relevant categories", () => {
    const actionableRecommendations = [actionableRec("restaurant"), actionableRec("income"), actionableRec("subscriptions"), actionableRec("investment")];
    const result = analyzeBehaviorProfile(context({ actionableRecommendations }));
    expect(result.recommendations.map((r) => r.category).sort()).toEqual(["restaurant", "subscriptions"]);
  });

  it("aggregates detected habits from multiple detectors at once", () => {
    const flags = [
      { key: "eatingOut" as const, transactionCount: 20, totalAmount: 6000, dataQuality: "full" as const },
      { key: "coffee" as const, transactionCount: 2, totalAmount: 100, dataQuality: "full" as const },
    ];
    const cashFlowAnalysis: BehaviorEngineContext["cashFlowAnalysis"] = {
      income: 30000,
      expense: 10000,
      saving: 20000,
      savingRatePercent: 66.7,
      netCashFlow: 20000,
      changeVsPreviousMonth: { income: null, expense: null, saving: null },
      monthlyTrend: [{ monthKey: "x", income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000 }],
    };
    const result = analyzeBehaviorProfile(
      context({
        behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
        cashFlowAnalysis,
        financialHealthScore: { overallScore: 70, grade: "B", status: "good", insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
      })
    );

    expect(result.detectedHabits.some((h) => h.id === "restaurant" && h.polarity === "negative")).toBe(true);
    expect(result.negativeHabits.some((h) => h.id === "restaurant")).toBe(true);
  });
});
