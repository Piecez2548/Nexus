import { describe, expect, it } from "vitest";
import { buildOverallAssessment } from "./overallAssessmentBuilder";
import type { FinancialHealthScoreResult, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";

function msg(key: string): ScoreMessage {
  return { key, params: {} };
}

function healthScore(overrides: Partial<FinancialHealthScoreResult> = {}): FinancialHealthScoreResult {
  return {
    overallScore: 70,
    grade: "B",
    status: "good",
    insufficientData: false,
    categoryScores: [],
    strengths: [],
    weaknesses: [],
    warnings: [],
    recommendations: [],
    improvementOpportunities: [],
    ...overrides,
  };
}

describe("buildOverallAssessment", () => {
  it("passes overallScore/grade/status/insufficientData through verbatim", () => {
    const result = buildOverallAssessment(healthScore({ overallScore: 82, grade: "A", status: "outstanding", insufficientData: false }));
    expect(result).toMatchObject({ overallScore: 82, grade: "A", status: "outstanding", insufficientData: false });
  });

  it("caps strengths/weaknesses to the top 3", () => {
    const strengths = [msg("s1"), msg("s2"), msg("s3"), msg("s4")];
    const weaknesses = [msg("w1"), msg("w2"), msg("w3"), msg("w4")];
    const result = buildOverallAssessment(healthScore({ strengths, weaknesses }));
    expect(result.topStrengths).toHaveLength(3);
    expect(result.topWeaknesses).toHaveLength(3);
    expect(result.topStrengths).toEqual([msg("s1"), msg("s2"), msg("s3")]);
  });

  it("reflects a null overallScore/grade/status for an insufficient-data profile", () => {
    const result = buildOverallAssessment(healthScore({ overallScore: null, grade: null, status: null, insufficientData: true }));
    expect(result.overallScore).toBeNull();
    expect(result.insufficientData).toBe(true);
  });
});
