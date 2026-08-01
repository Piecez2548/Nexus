import { describe, expect, it } from "vitest";
import { analyzeMerchantTrends } from "./merchantTrendAnalyzer";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";

function merchant(overrides: Partial<MerchantAnalysis>): MerchantAnalysis {
  return {
    alias: "Merchant",
    frequency: 1,
    totalSpending: 100,
    averagePurchase: 100,
    largestPurchase: null,
    monthlyGrowthPercent: null,
    categories: [],
    recommendations: [],
    ...overrides,
  };
}

describe("analyzeMerchantTrends", () => {
  it("classifies a merchant growing well past the threshold as growing", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "Shopee", monthlyGrowthPercent: 40 })]);
    expect(result.growingMerchants).toHaveLength(1);
    expect(result.growingMerchants[0].alias).toBe("Shopee");
  });

  it("classifies a merchant shrinking well past the threshold as declining", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "Lazada", monthlyGrowthPercent: -40 })]);
    expect(result.decliningMerchants).toHaveLength(1);
    expect(result.decliningMerchants[0].alias).toBe("Lazada");
  });

  it("classifies small fluctuations within the threshold as stable", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "7-Eleven", monthlyGrowthPercent: 5 })]);
    expect(result.growingMerchants).toHaveLength(0);
    expect(result.decliningMerchants).toHaveLength(0);
  });

  it("is insufficientData when there's no growth signal", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "New Place", monthlyGrowthPercent: null })]);
    expect(result.growingMerchants).toHaveLength(0);
    expect(result.decliningMerchants).toHaveLength(0);
  });

  it("ranks mostVisited by frequency, most frequent first", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "Rare", frequency: 1 }), merchant({ alias: "Frequent", frequency: 20 })]);
    expect(result.mostVisited.map((m) => m.alias)).toEqual(["Frequent", "Rare"]);
  });

  it("computes spending concentration as the top merchant's share of total spending", () => {
    const result = analyzeMerchantTrends([merchant({ alias: "Big", totalSpending: 800 }), merchant({ alias: "Small", totalSpending: 200 })]);
    expect(result.spendingConcentrationPercent).toBeCloseTo(80, 5);
  });

  it("is null with no merchants at all", () => {
    const result = analyzeMerchantTrends([]);
    expect(result.spendingConcentrationPercent).toBeNull();
    expect(result.mostVisited).toEqual([]);
  });
});
