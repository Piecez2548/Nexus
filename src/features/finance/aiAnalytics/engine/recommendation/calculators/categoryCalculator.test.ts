import { describe, expect, it } from "vitest";
import { calculateCategory } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/categoryCalculator";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function rec(key: string, params: Record<string, string | number> = {}): Recommendation {
  return {
    id: "test",
    key,
    priority: "medium",
    estimatedMonthlySavings: 0,
    confidence: "medium",
    estimatedImpact: null,
    params,
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "action", params: {} },
  };
}

describe("calculateCategory", () => {
  it.each([
    ["reduceRestaurantVisits", "restaurant"],
    ["restaurantVisitsCritical", "restaurant"],
    ["reduceCoffeeVisits", "coffee"],
    ["coffeeAboveMonthlyAverage", "coffee"],
    ["foodShareCritical", "food"],
    ["impulsePurchases", "shopping"],
    ["shoppingGrowthHigh", "shopping"],
    ["manySubscriptions", "subscriptions"],
    ["transportAboveAverage", "transport"],
    ["rideHailingDependency", "transport"],
    ["negativeCashFlow", "cashFlow"],
    ["savingRateCritical", "saving"],
    ["incomeIncreasing", "income"],
    ["goalCompleted", "goals"],
    ["reduceOverBudgetCategory", "budget"],
    ["expenseRatioHigh", "general"],
    ["merchantDependency", "general"],
    ["lateNightSpending", "general"],
  ])("maps rule key %s to category %s (no category param)", (key, expected) => {
    expect(calculateCategory(rec(key))).toBe(expected);
  });

  it("prefers a matching params.category over the static fallback", () => {
    expect(calculateCategory(rec("reduceOverBudgetCategory", { category: "Entertainment" }))).toBe("entertainment");
    expect(calculateCategory(rec("budgetNear90", { category: "Coffee Shop" }))).toBe("coffee");
  });

  it("falls back to the static table when params.category doesn't match any known keyword", () => {
    expect(calculateCategory(rec("reduceOverBudgetCategory", { category: "Miscellaneous" }))).toBe("budget");
  });

  it("special-cases reduceBehaviorSpending for the convenienceStore flag as shopping", () => {
    expect(calculateCategory(rec("reduceBehaviorSpending", { behavior: "convenienceStore" }))).toBe("shopping");
  });

  it("never produces the investment category (no data source exists for it)", () => {
    const allKeys = [
      "reduceRestaurantVisits", "restaurantVisitsCritical", "reduceCoffeeVisits", "coffeeAboveMonthlyAverage",
      "foodShareCritical", "foodIncreasingTrend", "impulsePurchases", "shoppingGrowthHigh", "weekendShopping",
      "manySubscriptions", "subscriptionPriceIncrease", "transportAboveAverage", "rideHailingDependency",
      "negativeCashFlow", "repeatedNegativeCashFlow", "expenseSpike", "savingRateCritical", "increaseSavingRate",
      "incomeGrowthNegative", "incomeIncreasing", "goalCompleted", "goalNearlyComplete", "goalBehindSchedule",
      "goalAcceleration", "reduceOverBudgetCategory", "budgetNear90", "expenseRatioHigh", "merchantDependency",
      "fastestGrowingMerchant", "largeSpendingAfterSalary", "lateNightSpending", "noSpendingStreak", "weekendOverspending",
    ];
    expect(allKeys.map((k) => calculateCategory(rec(k)))).not.toContain("investment");
  });
});
