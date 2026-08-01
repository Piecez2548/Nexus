import { describe, expect, it } from "vitest";
import { analyzeMerchantBehavior } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/merchantBehaviorAnalyzer";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

function merchant(overrides: Partial<MerchantAnalysis> = {}): MerchantAnalysis {
  return {
    alias: "A",
    frequency: 5,
    totalSpending: 1000,
    averagePurchase: 200,
    largestPurchase: null,
    monthlyGrowthPercent: null,
    categories: ["Food"],
    recommendations: [],
    ...overrides,
  };
}

function topMerchant(alias: string, monthlyTrend: { monthKey: string; amount: number }[]): TopMerchantEntry {
  return { alias, category: "Food", transactionCount: 5, totalAmount: 1000, averagePurchase: 200, lastUsedDate: "2026-07-20", monthlyTrend };
}

describe("analyzeMerchantBehavior", () => {
  it("returns an empty array with no merchants", () => {
    expect(analyzeMerchantBehavior([], [])).toEqual([]);
  });

  it("flags the highest-frequency merchant as favorite and highest-spending as most expensive", () => {
    const merchants = [merchant({ alias: "A", frequency: 10, totalSpending: 500 }), merchant({ alias: "B", frequency: 2, totalSpending: 5000 })];
    const result = analyzeMerchantBehavior(merchants, []);

    const a = result.find((r) => r.alias === "A")!;
    const b = result.find((r) => r.alias === "B")!;
    expect(a.isFavorite).toBe(true);
    expect(a.isMostExpensive).toBe(false);
    expect(b.isFavorite).toBe(false);
    expect(b.isMostExpensive).toBe(true);
  });

  it("computes loyaltyMonthsActive from the matching topMerchants monthlyTrend", () => {
    const trend = [
      { monthKey: "2026-02", amount: 0 },
      { monthKey: "2026-03", amount: 100 },
      { monthKey: "2026-04", amount: 0 },
      { monthKey: "2026-05", amount: 200 },
      { monthKey: "2026-06", amount: 150 },
      { monthKey: "2026-07", amount: 100 },
    ];
    const result = analyzeMerchantBehavior([merchant({ alias: "A" })], [topMerchant("A", trend)]);
    expect(result[0].loyaltyMonthsActive).toBe(4);
  });

  it("is zero loyalty when no matching topMerchants entry exists", () => {
    const result = analyzeMerchantBehavior([merchant({ alias: "A" })], []);
    expect(result[0].loyaltyMonthsActive).toBe(0);
  });

  it("sorts by totalSpending descending", () => {
    const merchants = [merchant({ alias: "Low", totalSpending: 100 }), merchant({ alias: "High", totalSpending: 900 })];
    const result = analyzeMerchantBehavior(merchants, []);
    expect(result.map((r) => r.alias)).toEqual(["High", "Low"]);
  });
});
