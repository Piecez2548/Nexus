import { describe, expect, it } from "vitest";
import { buildHeadline } from "./headlineBuilder";
import type { FinancialHealthScoreResult, CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { ForecastAlert } from "@/features/finance/aiAnalytics/engine/forecast/types";

function categoryScore(overrides: Partial<CategoryScoreResult> = {}): CategoryScoreResult {
  return {
    category: "savingRate",
    score: 50,
    weight: 25,
    explanation: { reason: { key: "r", params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] },
    ...overrides,
  };
}

function healthScore(overrides: Partial<FinancialHealthScoreResult> = {}): FinancialHealthScoreResult {
  return {
    overallScore: 70,
    grade: "B",
    status: "good",
    insufficientData: false,
    categoryScores: [categoryScore()],
    strengths: [],
    weaknesses: [],
    warnings: [],
    recommendations: [],
    improvementOpportunities: [],
    ...overrides,
  };
}

function alert(overrides: Partial<ForecastAlert>): ForecastAlert {
  return { id: "a1", type: "budgetOverflow", severity: "warning", message: { key: "m", params: {} }, relatedForecastKey: "x", sourceRecommendationId: null, ...overrides };
}

describe("buildHeadline", () => {
  it("is insufficientData when the health score judges data insufficient, regardless of other signals", () => {
    const result = buildHeadline(healthScore({ insufficientData: true, status: "excellent" }), alert({ severity: "critical" }));
    expect(result.key).toBe("insufficientData");
  });

  it("is budgetRiskDetected for a critical budgetOverflow alert", () => {
    const result = buildHeadline(healthScore(), alert({ severity: "critical", type: "budgetOverflow" }));
    expect(result.key).toBe("budgetRiskDetected");
  });

  it("is spendingRequiresAttention for a critical alert of a different type", () => {
    const result = buildHeadline(healthScore(), alert({ severity: "critical", type: "cashShortage" }));
    expect(result.key).toBe("spendingRequiresAttention");
  });

  it("is excellentFinancialProgress when health status is excellent/outstanding and there's no critical alert", () => {
    const result = buildHeadline(healthScore({ status: "excellent" }), null);
    expect(result.key).toBe("excellentFinancialProgress");
  });

  it("is strongSavingPerformance when Prompt 005's own scorer already flagged a positive saving-rate factor", () => {
    const categoryScores = [categoryScore({ category: "savingRate", explanation: { reason: { key: "r", params: {} }, positiveFactors: [{ key: "p", params: {} }], negativeFactors: [], improvementSuggestions: [] } })];
    const result = buildHeadline(healthScore({ status: "good", categoryScores }), null);
    expect(result.key).toBe("strongSavingPerformance");
  });

  it("is spendingRequiresAttention for a non-critical warning alert when no stronger signal applies", () => {
    const result = buildHeadline(healthScore({ status: "good" }), alert({ severity: "warning" }));
    expect(result.key).toBe("spendingRequiresAttention");
  });

  it("falls back to stableFinancialPosition when nothing else applies", () => {
    const result = buildHeadline(healthScore({ status: "good" }), null);
    expect(result.key).toBe("stableFinancialPosition");
  });

  it("always returns a message key namespaced under aiAnalytics.executiveSummaryReport.headline", () => {
    const result = buildHeadline(healthScore(), null);
    expect(result.message.key).toBe(`aiAnalytics.executiveSummaryReport.headline.${result.key}`);
  });
});
