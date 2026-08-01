import { describe, expect, it } from "vitest";
import { trendForCategory } from "@/features/finance/aiAnalytics/models/category-analysis.model";
import type { CategoryDetailResult } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

function detail(monthlyTrend: { monthKey: string; amount: number }[]): CategoryDetailResult {
  return {
    category: "Food",
    totalSpent: 0,
    transactionCount: 0,
    averagePerPurchase: 0,
    averagePerDay: 0,
    monthlyTrend,
    transactions: [],
    topMerchant: null,
    budget: null,
    recommendation: null,
    potentialSavings: null,
  };
}

describe("trendForCategory", () => {
  it("is stable with fewer than 2 months of trend data", () => {
    expect(trendForCategory(detail([{ monthKey: "2026-07", amount: 1000 }]))).toBe("stable");
  });

  it("is increasing when the latest month is higher than the previous one", () => {
    expect(
      trendForCategory(
        detail([
          { monthKey: "2026-06", amount: 1000 },
          { monthKey: "2026-07", amount: 1500 },
        ])
      )
    ).toBe("increasing");
  });

  it("is decreasing when the latest month is lower than the previous one", () => {
    expect(
      trendForCategory(
        detail([
          { monthKey: "2026-06", amount: 1500 },
          { monthKey: "2026-07", amount: 1000 },
        ])
      )
    ).toBe("decreasing");
  });

  it("is stable when both months are zero", () => {
    expect(
      trendForCategory(
        detail([
          { monthKey: "2026-06", amount: 0 },
          { monthKey: "2026-07", amount: 0 },
        ])
      )
    ).toBe("stable");
  });
});
