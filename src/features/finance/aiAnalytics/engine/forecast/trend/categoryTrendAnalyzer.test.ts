import { describe, expect, it } from "vitest";
import { analyzeCategoryTrends } from "./categoryTrendAnalyzer";
import type { CategoryComparisonEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 15); // 2026-07-15

function tx(category: string, amount: number, date: string): Transaction {
  return { title: category, amount, type: "expense", category, account: "Cash", date, status: "completed" };
}

const categoryComparison: CategoryComparisonEntry[] = [
  { category: "Food", current: 250, previous: 200, changePercent: 25 },
  { category: "Shopping", current: 100, previous: 150, changePercent: -33.3 },
  { category: "Transport", current: 50, previous: 50, changePercent: 0 },
];

const transactions: Transaction[] = [
  // Food: rising each month (Apr 100 -> May 150 -> Jun 200 -> Jul 250)
  tx("Food", 100, "2026-04-10"),
  tx("Food", 150, "2026-05-10"),
  tx("Food", 200, "2026-06-10"),
  tx("Food", 250, "2026-07-10"),
  // Shopping: falling each month (May 200 -> Jun 150 -> Jul 100)
  tx("Shopping", 300, "2026-03-10"),
  tx("Shopping", 200, "2026-05-10"),
  tx("Shopping", 150, "2026-06-10"),
  tx("Shopping", 100, "2026-07-10"),
  // Transport: flat every month
  tx("Transport", 50, "2026-02-10"),
  tx("Transport", 50, "2026-03-10"),
  tx("Transport", 50, "2026-04-10"),
  tx("Transport", 50, "2026-05-10"),
  tx("Transport", 50, "2026-06-10"),
  tx("Transport", 50, "2026-07-10"),
];

describe("analyzeCategoryTrends", () => {
  it("classifies a consistently rising category as increasing, with the correct last-two-month growth", () => {
    const result = analyzeCategoryTrends(transactions, categoryComparison, now);
    const food = result.entries.find((e) => e.category === "Food")!;
    expect(food.direction).toBe("increasing");
    expect(food.monthlyGrowthPercent).toBeCloseTo(25, 1); // (250-200)/200 * 100
  });

  it("classifies a consistently falling category as decreasing", () => {
    const result = analyzeCategoryTrends(transactions, categoryComparison, now);
    const shopping = result.entries.find((e) => e.category === "Shopping")!;
    expect(shopping.direction).toBe("decreasing");
    expect(shopping.monthlyGrowthPercent).toBeCloseTo(-33.33, 1); // (100-150)/150 * 100
  });

  it("classifies a flat category as stable", () => {
    const result = analyzeCategoryTrends(transactions, categoryComparison, now);
    const transport = result.entries.find((e) => e.category === "Transport")!;
    expect(transport.direction).toBe("stable");
  });

  it("identifies the fastest growing and fastest declining categories", () => {
    const result = analyzeCategoryTrends(transactions, categoryComparison, now);
    expect(result.fastestGrowingCategory).toBe("Food");
    expect(result.fastestDecliningCategory).toBe("Shopping");
    expect(result.stableCategories).toEqual(["Transport"]);
  });

  it("is insufficientData for a category with fewer than 2 months of expense history", () => {
    const sparseComparison: CategoryComparisonEntry[] = [{ category: "Travel", current: 500, previous: 0, changePercent: null }];
    const sparseTransactions: Transaction[] = [tx("Travel", 500, "2026-07-05")];
    const result = analyzeCategoryTrends(sparseTransactions, sparseComparison, now);
    expect(result.entries[0].direction).toBe("insufficientData");
    expect(result.entries[0].monthlyGrowthPercent).toBeNull();
  });

  it("returns no fastest growing/declining category when nothing qualifies", () => {
    const flatComparison: CategoryComparisonEntry[] = [{ category: "Transport", current: 50, previous: 50, changePercent: 0 }];
    const result = analyzeCategoryTrends(transactions, flatComparison, now);
    expect(result.fastestGrowingCategory).toBeNull();
    expect(result.fastestDecliningCategory).toBeNull();
  });
});
