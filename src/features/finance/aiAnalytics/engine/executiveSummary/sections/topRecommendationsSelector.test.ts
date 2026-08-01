import { describe, expect, it } from "vitest";
import { selectTopRecommendations, MAX_TOP_RECOMMENDATIONS } from "./topRecommendationsSelector";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function rec(id: string): ActionableRecommendation {
  return {
    id,
    priority: "medium",
    category: "food",
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

describe("selectTopRecommendations", () => {
  it("takes the first 5, preserving the already-prioritized order", () => {
    const all = Array.from({ length: 8 }, (_, i) => rec(`r${i}`));
    const result = selectTopRecommendations(all);
    expect(result).toHaveLength(MAX_TOP_RECOMMENDATIONS);
    expect(result.map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3", "r4"]);
  });

  it("returns fewer than 5 when fewer exist, without padding", () => {
    const result = selectTopRecommendations([rec("only")]);
    expect(result).toEqual([rec("only")]);
  });

  it("returns an empty array when there are none", () => {
    expect(selectTopRecommendations([])).toEqual([]);
  });
});
