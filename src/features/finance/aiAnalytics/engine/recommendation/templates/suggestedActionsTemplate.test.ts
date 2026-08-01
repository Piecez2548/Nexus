import { describe, expect, it } from "vitest";
import { buildSuggestedActions } from "@/features/finance/aiAnalytics/engine/recommendation/templates/suggestedActionsTemplate";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function rec(): Recommendation {
  return {
    id: "test",
    key: "reduceRestaurantVisits",
    priority: "high",
    estimatedMonthlySavings: 1200,
    confidence: "high",
    estimatedImpact: null,
    params: { count: 28 },
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "aiAnalytics.recommendations.actions.reduceRestaurantVisits", params: { count: 28 } },
  };
}

describe("buildSuggestedActions", () => {
  it("reuses the rule's own action message verbatim for immediate", () => {
    const result = buildSuggestedActions(rec(), "restaurant");
    expect(result.immediate).toEqual(rec().action);
  });

  it("namespaces weekly/monthly/longTerm keys by category", () => {
    const result = buildSuggestedActions(rec(), "restaurant");
    expect(result.weekly.key).toBe("aiAnalytics.actionableRecommendations.suggestedActions.restaurant.weekly");
    expect(result.monthly.key).toBe("aiAnalytics.actionableRecommendations.suggestedActions.restaurant.monthly");
    expect(result.longTerm.key).toBe("aiAnalytics.actionableRecommendations.suggestedActions.restaurant.longTerm");
  });

  it("uses a different namespace for a different category", () => {
    const result = buildSuggestedActions(rec(), "subscriptions");
    expect(result.weekly.key).toBe("aiAnalytics.actionableRecommendations.suggestedActions.subscriptions.weekly");
  });
});
