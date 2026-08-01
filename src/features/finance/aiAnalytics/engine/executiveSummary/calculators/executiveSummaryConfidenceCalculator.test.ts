import { describe, expect, it } from "vitest";
import { calculateExecutiveSummaryConfidence } from "./executiveSummaryConfidenceCalculator";
import type { FinancialHealthScoreResult, CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

function categoryScore(score: number | null): CategoryScoreResult {
  return { category: "savingRate", score, weight: 25, explanation: { reason: { key: "r", params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] } };
}

function healthScore(overrides: Partial<FinancialHealthScoreResult> = {}): FinancialHealthScoreResult {
  return {
    overallScore: 70,
    grade: "B",
    status: "good",
    insufficientData: false,
    categoryScores: Array.from({ length: 7 }, () => categoryScore(60)),
    strengths: [],
    weaknesses: [],
    warnings: [],
    recommendations: [],
    improvementOpportunities: [],
    ...overrides,
  };
}

describe("calculateExecutiveSummaryConfidence", () => {
  it("blends behavior/forecast/health-score-completeness with the documented weights", () => {
    // All categories scored -> healthScoreConfidence = 100.
    const result = calculateExecutiveSummaryConfidence(80, 60, healthScore());
    expect(result).toBe(Math.round(80 * 0.3 + 60 * 0.3 + 100 * 0.4));
  });

  it("penalizes insufficientData with a flat -15", () => {
    const sufficient = calculateExecutiveSummaryConfidence(60, 60, healthScore({ insufficientData: false }));
    const insufficient = calculateExecutiveSummaryConfidence(60, 60, healthScore({ insufficientData: true }));
    expect(insufficient).toBe(sufficient - 15);
  });

  it("scores health-score confidence by category-completeness, not by score magnitude", () => {
    const halfScored = healthScore({ categoryScores: [categoryScore(90), categoryScore(90), categoryScore(90), categoryScore(null), categoryScore(null), categoryScore(null), categoryScore(null)] });
    const result = calculateExecutiveSummaryConfidence(0, 0, halfScored);
    // 3/7 scored -> healthScoreConfidence ~= 42.86 -> *0.4 ~= 17.14 -> round to 17.
    expect(result).toBe(Math.round((3 / 7) * 100 * 0.4));
  });

  it("is 0 with no category scores at all", () => {
    const result = calculateExecutiveSummaryConfidence(0, 0, healthScore({ categoryScores: [], insufficientData: true }));
    expect(result).toBe(0);
  });

  it("always clamps within 0-100", () => {
    expect(calculateExecutiveSummaryConfidence(100, 100, healthScore({ insufficientData: false }))).toBeLessThanOrEqual(100);
    expect(calculateExecutiveSummaryConfidence(0, 0, healthScore({ categoryScores: [], insufficientData: true }))).toBeGreaterThanOrEqual(0);
  });
});
