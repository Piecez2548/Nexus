import { describe, expect, it } from "vitest";
import { buildActionPlan } from "./actionPlanAggregator";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function rec(id: string, category: ActionableRecommendation["category"], immediateKey: string): ActionableRecommendation {
  const NS = "aiAnalytics.actionableRecommendations.suggestedActions";
  return {
    id,
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
    suggestedActions: {
      immediate: { key: immediateKey, params: {} },
      weekly: { key: `${NS}.${category}.weekly`, params: {} },
      monthly: { key: `${NS}.${category}.monthly`, params: {} },
      longTerm: { key: `${NS}.${category}.longTerm`, params: {} },
    },
    relatedRules: ["someRule"],
    createdTime: "2026-07-01T00:00:00.000Z",
  };
}

describe("buildActionPlan", () => {
  it("collects each bucket from every recommendation", () => {
    const result = buildActionPlan([rec("r1", "food", "immediate-1")]);
    expect(result.immediate).toEqual([{ key: "immediate-1", params: {} }]);
    expect(result.weekly).toEqual([{ key: "aiAnalytics.actionableRecommendations.suggestedActions.food.weekly", params: {} }]);
  });

  it("dedupes weekly/monthly/longTerm across two recommendations sharing the same category", () => {
    const result = buildActionPlan([rec("r1", "food", "immediate-1"), rec("r2", "food", "immediate-2")]);
    expect(result.weekly).toHaveLength(1); // same category-level template -> same key
    expect(result.immediate).toHaveLength(2); // distinct per-rule content -> not deduped
  });

  it("keeps buckets separate across different categories", () => {
    const result = buildActionPlan([rec("r1", "food", "i1"), rec("r2", "shopping", "i2")]);
    expect(result.weekly).toHaveLength(2);
  });

  it("returns empty buckets with no recommendations", () => {
    const result = buildActionPlan([]);
    expect(result).toEqual({ immediate: [], weekly: [], monthly: [], longTerm: [] });
  });
});
