import { describe, expect, it } from "vitest";
import { generateActionableRecommendations } from "@/features/finance/aiAnalytics/engine/recommendation/engine/generateActionableRecommendations";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const now = new Date(2026, 6, 30);

function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "test",
    key: "reduceRestaurantVisits",
    priority: "medium",
    estimatedMonthlySavings: 500,
    confidence: "medium",
    estimatedImpact: null,
    params: {},
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "action", params: {} },
    ...overrides,
  };
}

function context(recommendations: Recommendation[]): RecommendationEngineContext {
  return {
    recommendations,
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    cashFlowAnalysis: { income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    merchantAnalysis: [],
    financialHealthScore: { overallScore: 80, grade: "B+", status: "veryGood", insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    monthsOfHistory: 6,
    now,
  };
}

describe("generateActionableRecommendations", () => {
  it("returns an empty list with no rule findings", () => {
    expect(generateActionableRecommendations(context([]))).toEqual([]);
  });

  it("enriches every rule finding into an ActionableRecommendation", () => {
    const result = generateActionableRecommendations(context([rec({ id: "a" }), rec({ id: "b" })]));
    expect(result).toHaveLength(2);
    expect(result.every((r) => typeof r.confidence === "number")).toBe(true);
  });

  it("returns the batch already prioritized (highest priority first)", () => {
    const low = rec({ id: "low", priority: "low" });
    const critical = rec({ id: "critical", priority: "critical" });
    const result = generateActionableRecommendations(context([low, critical]));
    expect(result.map((r) => r.id)).toEqual(["critical", "low"]);
  });
});
