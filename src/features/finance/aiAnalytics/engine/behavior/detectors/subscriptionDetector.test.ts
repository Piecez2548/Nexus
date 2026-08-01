import { describe, expect, it } from "vitest";
import { detectSubscriptionHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/subscriptionDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

function subscription(averageAmount: number): SubscriptionEntry {
  return { normalizedTitle: "netflix", representativeTitle: "Netflix", category: "Entertainment", averageAmount, occurrenceCount: 3, lastDate: "2026-07-01", averageIntervalDays: 30, lastAmount: averageAmount, previousAmount: averageAmount };
}

function context(subscriptions: SubscriptionEntry[], income = 30000): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions, impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now: new Date(2026, 6, 30),
  };
}

describe("detectSubscriptionHabit", () => {
  it("is null with no subscriptions", () => {
    expect(detectSubscriptionHabit(context([]))).toBeNull();
  });

  it("is negative when subscriptions consume a high share of income", () => {
    const result = detectSubscriptionHabit(context([subscription(5000), subscription(3000)], 30000)); // ~27%
    expect(result?.polarity).toBe("negative");
  });

  it("is positive when subscriptions are a small share of income", () => {
    const result = detectSubscriptionHabit(context([subscription(300)], 30000)); // 1%
    expect(result?.polarity).toBe("positive");
  });

  it("is neutral in between", () => {
    const result = detectSubscriptionHabit(context([subscription(3000)], 30000)); // 10%
    expect(result?.polarity).toBe("neutral");
  });
});
