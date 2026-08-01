import { describe, expect, it } from "vitest";
import { respondCategorySpending } from "./categorySpendingResponder";
import { respondMerchantSpending } from "./merchantSpendingResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { MerchantBehaviorEntry } from "@/features/finance/aiAnalytics/engine/behavior/types";

function emptySpending() {
  return { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null };
}

function merchant(overrides: Partial<MerchantAnalysis> = {}): MerchantAnalysis {
  return { alias: "Shopee", frequency: 5, totalSpending: 1000, averagePurchase: 200, largestPurchase: null, monthlyGrowthPercent: null, categories: ["Shopping"], recommendations: [], ...overrides };
}

function merchantBehavior(overrides: Partial<MerchantBehaviorEntry> = {}): MerchantBehaviorEntry {
  return { alias: "7-Eleven", category: "Food", totalSpending: 500, frequency: 10, isFavorite: false, isMostExpensive: false, loyaltyMonthsActive: 3, monthlyGrowthPercent: null, ...overrides };
}

describe("respondCategorySpending — the honesty path", () => {
  it("answers with the top category's real totals", () => {
    const data = { spendingAnalysis: { ...emptySpending(), topCategories: [{ category: "Food", amount: 5000, percentOfTotal: 40 }] }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCategorySpending(data);
    expect(result.answer.params.category).toBe("Food");
    expect(result.answer.params.amount).toBe(5000);
  });

  it("is capped by the deep-dive confidence ceiling, even with perfect data", () => {
    const data = { spendingAnalysis: { ...emptySpending(), topCategories: [{ category: "Food", amount: 5000, percentOfTotal: 100 }] }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCategorySpending(data);
    expect(result.confidence).toBeLessThanOrEqual(65);
  });

  it("always states the honesty-path reason, even with no data", () => {
    const data = { spendingAnalysis: emptySpending(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCategorySpending(data);
    expect(result.reason.key).toBe("aiAnalytics.aiCoach.answers.categorySpending.reason");
    expect(result.answer.key).toContain("noData");
  });
});

describe("respondMerchantSpending", () => {
  it("answers with the true highest-spend merchant, not just array[0]", () => {
    const merchantAnalysis = [merchant({ alias: "Small", totalSpending: 200 }), merchant({ alias: "Big", totalSpending: 5000 })];
    const data = { merchantAnalysis, behaviorProfile: { profile: { merchantBehavior: [] } }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondMerchantSpending(data);
    expect(result.answer.params.alias).toBe("Big");
  });

  it("frames the reason around the favorite merchant when it differs from the top-spend one", () => {
    const merchantAnalysis = [merchant({ alias: "Big", totalSpending: 5000 })];
    const merchantBehaviorList = [merchantBehavior({ alias: "7-Eleven", isFavorite: true, loyaltyMonthsActive: 6 })];
    const data = { merchantAnalysis, behaviorProfile: { profile: { merchantBehavior: merchantBehaviorList } }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondMerchantSpending(data);
    expect(result.reason.key).toContain("reasonFavorite");
    expect(result.reason.params.favoriteAlias).toBe("7-Eleven");
  });

  it("never fabricates a merchant when there's no merchant data at all", () => {
    const data = { merchantAnalysis: [], behaviorProfile: { profile: { merchantBehavior: [] } }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondMerchantSpending(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});
