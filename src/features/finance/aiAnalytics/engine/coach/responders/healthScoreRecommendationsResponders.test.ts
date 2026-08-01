import { describe, expect, it } from "vitest";
import { respondFinancialHealthScore } from "./financialHealthScoreResponder";
import { respondRecommendations } from "./recommendationsResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function categoryScore(category: CategoryScoreResult["category"], score: number | null, negativeFactorKey?: string): CategoryScoreResult {
  return {
    category,
    score,
    weight: 20,
    explanation: {
      reason: { key: "r", params: {} },
      positiveFactors: [],
      negativeFactors: negativeFactorKey ? [{ key: negativeFactorKey, params: {} }] : [],
      improvementSuggestions: [],
    },
  };
}

function rec(overrides: Partial<ActionableRecommendation> = {}): ActionableRecommendation {
  return {
    id: "rec-1",
    priority: "high",
    category: "food",
    title: { key: "t", params: {} },
    summary: { key: "s", params: {} },
    description: { key: "d", params: {} },
    reason: { key: "specific-reason", params: {} },
    supportingMetrics: {},
    confidence: 60,
    estimatedMonthlySavings: 500,
    estimatedAnnualSavings: 6000,
    estimatedFinancialImpact: { monthlySavings: 500, annualSavings: 6000, budgetImprovementPercent: null, savingRateImprovementPercent: null },
    difficulty: "easy",
    expectedCompletionTime: "immediate",
    suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
    relatedRules: ["someRule"],
    createdTime: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("respondFinancialHealthScore", () => {
  it("answers why the score is low using the lowest-scoring category's own negative factor", () => {
    const categoryScores = [categoryScore("savingRate", 80), categoryScore("budgetDiscipline", 20, "aiAnalytics.financialHealthScore.budgetDiscipline.negative.overspending")];
    const data = {
      financialHealthScore: { overallScore: 55, grade: "D", status: "poor", insufficientData: false, categoryScores, strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
      actionableRecommendations: [],
    } as unknown as FinancialAnalysisResult;

    const result = respondFinancialHealthScore(data);
    expect(result.answer.params.overallScore).toBe(55);
    expect(result.reason.key).toBe("aiAnalytics.financialHealthScore.budgetDiscipline.negative.overspending");
    expect(result.supportingMetrics.lowestCategory).toBe("budgetDiscipline");
  });

  it("falls back to top-level weaknesses when no category has a negative factor", () => {
    const categoryScores = [categoryScore("savingRate", 80)];
    const data = {
      financialHealthScore: { overallScore: 70, grade: "B", status: "good", insufficientData: false, categoryScores, strengths: [], weaknesses: [{ key: "top-level-weakness", params: {} }], warnings: [], recommendations: [], improvementOpportunities: [] },
      actionableRecommendations: [],
    } as unknown as FinancialAnalysisResult;

    const result = respondFinancialHealthScore(data);
    expect(result.reason.key).toBe("top-level-weakness");
  });

  it("never fabricates a score when the profile is insufficientData", () => {
    const data = {
      financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
      actionableRecommendations: [],
    } as unknown as FinancialAnalysisResult;

    const result = respondFinancialHealthScore(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});

describe("respondRecommendations", () => {
  it("answers with the top-priority recommendation's own category and reason, unmodified", () => {
    const data = { actionableRecommendations: [rec({ category: "restaurant" }), rec({ id: "rec-2", category: "shopping" })] } as unknown as FinancialAnalysisResult;
    const result = respondRecommendations(data);
    expect(result.answer.params.category).toBe("restaurant");
    expect(result.reason.key).toBe("specific-reason");
    expect(result.relatedRecommendations).toHaveLength(2);
  });

  it("never fabricates a recommendation when there are none", () => {
    const data = { actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondRecommendations(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});
