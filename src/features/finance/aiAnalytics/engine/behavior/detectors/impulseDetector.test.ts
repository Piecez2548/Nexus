import { describe, expect, it } from "vitest";
import { detectImpulseHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/impulseDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ImpulsePurchaseEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

function purchase(amount: number): ImpulsePurchaseEntry {
  return { id: 1, title: "Gadget", amount, category: "Shopping", date: "2026-07-10", reason: "aboveAverageNoBudget" };
}

function context(impulsePurchases: ImpulsePurchaseEntry[]): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases, mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [{ monthKey: "x", income: 0, expense: 10000, saving: 0, savingRatePercent: null, netCashFlow: 0 }] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now: new Date(2026, 6, 30),
  };
}

describe("detectImpulseHabit", () => {
  it("is null with no impulse purchases", () => {
    expect(detectImpulseHabit(context([]))).toBeNull();
  });

  it("is negative when the count meets the threshold", () => {
    const result = detectImpulseHabit(context([purchase(100), purchase(100), purchase(100)]));
    expect(result?.polarity).toBe("negative");
  });

  it("is neutral (never positive) below the count and share thresholds", () => {
    const result = detectImpulseHabit(context([purchase(50)]));
    expect(result?.polarity).toBe("neutral");
  });

  it("is negative when a single large impulse purchase exceeds the share threshold", () => {
    const result = detectImpulseHabit(context([purchase(2000)])); // 20% of 10000
    expect(result?.polarity).toBe("negative");
  });
});
