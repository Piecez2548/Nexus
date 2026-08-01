// Smoke tests for the 5 thin flagBasedDetector wrappers — each just needs
// to prove it reads the right flag key. The shared classification logic
// itself is fully covered by flagBasedDetector.test.ts.
import { describe, expect, it } from "vitest";
import { detectRestaurantHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/restaurantDetector";
import { detectCoffeeHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/coffeeDetector";
import { detectConvenienceStoreHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/convenienceStoreDetector";
import { detectWeekendHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/weekendDetector";
import { detectLateNightHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/lateNightDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

function flag(key: BehaviorFlag["key"], amount: number): BehaviorFlag {
  return { key, transactionCount: 5, totalAmount: amount, dataQuality: "full" };
}

function context(flags: BehaviorFlag[]): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
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

describe("named flag detectors", () => {
  it("detectRestaurantHabit reads the eatingOut flag", () => {
    const result = detectRestaurantHabit(context([flag("eatingOut", 4000)]));
    expect(result?.id).toBe("restaurant");
    expect(result?.polarity).toBe("negative");
  });

  it("detectCoffeeHabit reads the coffee flag", () => {
    const result = detectCoffeeHabit(context([flag("coffee", 4000)]));
    expect(result?.id).toBe("coffee");
  });

  it("detectConvenienceStoreHabit reads the convenienceStore flag", () => {
    const result = detectConvenienceStoreHabit(context([flag("convenienceStore", 4000)]));
    expect(result?.id).toBe("convenienceStore");
  });

  it("detectWeekendHabit reads the weekendSpending flag", () => {
    const result = detectWeekendHabit(context([flag("weekendSpending", 4000)]));
    expect(result?.id).toBe("weekend");
  });

  it("detectLateNightHabit reads the nightSpending flag", () => {
    const result = detectLateNightHabit(context([flag("nightSpending", 4000)]));
    expect(result?.id).toBe("lateNight");
  });

  it("returns null when the relevant flag is absent from behaviorAnalysis.flags", () => {
    expect(detectRestaurantHabit(context([]))).toBeNull();
  });
});
