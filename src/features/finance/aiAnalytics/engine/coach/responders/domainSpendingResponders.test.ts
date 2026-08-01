import { describe, expect, it } from "vitest";
import { respondCoffeeAnalysis } from "./coffeeResponder";
import { respondRestaurantAnalysis } from "./restaurantResponder";
import { respondShoppingAnalysis } from "./shoppingResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function emptyDomain(): DomainSpendingAnalysis {
  return { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null };
}

function realDomain(overrides: Partial<DomainSpendingAnalysis> = {}): DomainSpendingAnalysis {
  return { totalSpent: 3000, transactionCount: 12, averagePerVisit: 250, averagePerDay: 100, monthlyTrend: [], weeklyTrend: [], topMerchant: { alias: "Starbucks", totalAmount: 1200 }, ...overrides };
}

function rec(category: ActionableRecommendation["category"]): ActionableRecommendation {
  return {
    id: `rec-${category}`,
    priority: "medium",
    category,
    title: { key: "t", params: {} },
    summary: { key: "s", params: {} },
    description: { key: "d", params: {} },
    reason: { key: "r", params: {} },
    supportingMetrics: {},
    confidence: 60,
    estimatedMonthlySavings: 100,
    estimatedAnnualSavings: 1200,
    estimatedFinancialImpact: { monthlySavings: 100, annualSavings: 1200, budgetImprovementPercent: null, savingRateImprovementPercent: null },
    difficulty: "easy",
    expectedCompletionTime: "immediate",
    suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
    relatedRules: ["someRule"],
    createdTime: "2026-07-01T00:00:00.000Z",
  };
}

function data(overrides: { foodAnalysis?: DomainSpendingAnalysis; coffeeAnalysis?: DomainSpendingAnalysis; shoppingAnalysis?: DomainSpendingAnalysis; actionableRecommendations?: ActionableRecommendation[] } = {}): FinancialAnalysisResult {
  return {
    behaviorProfile: {
      profile: {
        foodAnalysis: overrides.foodAnalysis ?? emptyDomain(),
        coffeeAnalysis: overrides.coffeeAnalysis ?? emptyDomain(),
        shoppingAnalysis: overrides.shoppingAnalysis ?? emptyDomain(),
      },
    },
    actionableRecommendations: overrides.actionableRecommendations ?? [],
  } as unknown as FinancialAnalysisResult;
}

describe.each([
  ["respondRestaurantAnalysis", respondRestaurantAnalysis, "foodAnalysis", ["restaurant", "food"]] as const,
  ["respondCoffeeAnalysis", respondCoffeeAnalysis, "coffeeAnalysis", ["coffee"]] as const,
  ["respondShoppingAnalysis", respondShoppingAnalysis, "shoppingAnalysis", ["shopping"]] as const,
])("%s", (_name, respond, field, matchingCategories) => {
  const unrelatedCategory: ActionableRecommendation["category"] = "transport";

  it("answers with real numbers when there is domain spending", () => {
    const result = respond(data({ [field]: realDomain() }));
    expect(result.answer.key).toContain("hasData");
    expect(result.answer.params.totalSpent).toBe(3000);
    expect(result.answer.params.transactionCount).toBe(12);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("never fabricates when there is zero domain spending", () => {
    const result = respond(data({ [field]: emptyDomain() }));
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
    expect(result.relatedRecommendations).toEqual([]);
  });

  it("only surfaces recommendations from a matching category, never an unrelated domain's", () => {
    const result = respond(data({ [field]: realDomain(), actionableRecommendations: [rec(matchingCategories[0]), rec(unrelatedCategory)] }));
    expect(result.relatedRecommendations).toHaveLength(1);
    expect(matchingCategories).toContain(result.relatedRecommendations[0].category);
  });

  it("applies the thin-sample penalty for a small transaction count", () => {
    const result = respond(data({ [field]: realDomain({ transactionCount: 1 }) }));
    expect(result.confidence).toBeLessThan(90);
  });
});
