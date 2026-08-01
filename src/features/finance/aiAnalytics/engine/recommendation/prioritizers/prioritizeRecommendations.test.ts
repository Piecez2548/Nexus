import { describe, expect, it } from "vitest";
import { prioritizeRecommendations } from "@/features/finance/aiAnalytics/engine/recommendation/prioritizers/prioritizeRecommendations";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function actionable(overrides: Partial<ActionableRecommendation> = {}): ActionableRecommendation {
  return {
    id: "test",
    priority: "medium",
    category: "general",
    title: { key: "title", params: {} },
    summary: { key: "summary", params: {} },
    description: { key: "description", params: {} },
    reason: { key: "reason", params: {} },
    supportingMetrics: {},
    confidence: 60,
    estimatedMonthlySavings: 0,
    estimatedAnnualSavings: 0,
    estimatedFinancialImpact: { monthlySavings: 0, annualSavings: 0, budgetImprovementPercent: null, savingRateImprovementPercent: null },
    difficulty: "moderate",
    expectedCompletionTime: "thisMonth",
    suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
    relatedRules: ["test"],
    createdTime: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("prioritizeRecommendations", () => {
  it("sorts by priority tier first (critical before information)", () => {
    const low = actionable({ id: "low", priority: "low" });
    const critical = actionable({ id: "critical", priority: "critical" });
    const info = actionable({ id: "info", priority: "information" });
    const result = prioritizeRecommendations([info, low, critical]);
    expect(result.map((r) => r.id)).toEqual(["critical", "low", "info"]);
  });

  it("breaks priority ties by estimated monthly savings, descending", () => {
    const small = actionable({ id: "small", priority: "high", estimatedMonthlySavings: 200 });
    const large = actionable({ id: "large", priority: "high", estimatedMonthlySavings: 1000 });
    const result = prioritizeRecommendations([small, large]);
    expect(result.map((r) => r.id)).toEqual(["large", "small"]);
  });

  it("breaks savings ties by confidence, descending", () => {
    const lowConf = actionable({ id: "lowConf", priority: "high", estimatedMonthlySavings: 500, confidence: 40 });
    const highConf = actionable({ id: "highConf", priority: "high", estimatedMonthlySavings: 500, confidence: 90 });
    const result = prioritizeRecommendations([lowConf, highConf]);
    expect(result.map((r) => r.id)).toEqual(["highConf", "lowConf"]);
  });

  it("breaks confidence ties by difficulty, easier first", () => {
    const hard = actionable({ id: "hard", priority: "high", estimatedMonthlySavings: 500, confidence: 70, difficulty: "hard" });
    const easy = actionable({ id: "easy", priority: "high", estimatedMonthlySavings: 500, confidence: 70, difficulty: "easy" });
    const result = prioritizeRecommendations([hard, easy]);
    expect(result.map((r) => r.id)).toEqual(["easy", "hard"]);
  });

  it("does not mutate the input array", () => {
    const input = [actionable({ id: "a", priority: "low" }), actionable({ id: "b", priority: "critical" })];
    const inputCopy = [...input];
    prioritizeRecommendations(input);
    expect(input).toEqual(inputCopy);
  });
});
