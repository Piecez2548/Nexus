import { describe, expect, it } from "vitest";
import { detectShoppingHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/shoppingDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

function context(topCategories: TopCategoryEntry[]): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories, categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now: new Date(2026, 6, 30),
  };
}

describe("detectShoppingHabit", () => {
  it("is null when no category name matches a shopping keyword", () => {
    expect(detectShoppingHabit(context([{ category: "Food", amount: 1000, percentOfTotal: 50 }]))).toBeNull();
  });

  it("is negative when a matching category dominates spending", () => {
    const result = detectShoppingHabit(context([{ category: "Shopping", amount: 3000, percentOfTotal: 30 }]));
    expect(result?.polarity).toBe("negative");
  });

  it("is neutral when a matching category is present but not concentrated", () => {
    const result = detectShoppingHabit(context([{ category: "Retail", amount: 500, percentOfTotal: 10 }]));
    expect(result?.polarity).toBe("neutral");
  });
});
