import { describe, expect, it } from "vitest";
import { aggregateExplanations } from "@/features/finance/aiAnalytics/engine/scoring/explanations/aggregateExplanations";
import type { CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

function category(score: number | null, overrides: Partial<CategoryScoreResult["explanation"]> = {}): CategoryScoreResult {
  return {
    category: "savingRate",
    score,
    weight: 25,
    explanation: {
      reason: { key: "reason", params: {} },
      positiveFactors: [{ key: "positive", params: {} }],
      negativeFactors: [{ key: "negative", params: {} }],
      improvementSuggestions: [{ key: "suggestion", params: {} }],
      ...overrides,
    },
  };
}

describe("aggregateExplanations", () => {
  it("returns all-empty buckets with no category scores", () => {
    expect(aggregateExplanations([])).toEqual({ strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] });
  });

  it("excludes categories with a null score from every bucket", () => {
    const result = aggregateExplanations([category(null)]);
    expect(result).toEqual({ strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] });
  });

  it("puts a >=80 category's positive factors into strengths only", () => {
    const cat = category(85);
    const result = aggregateExplanations([cat]);
    expect(result.strengths).toEqual(cat.explanation.positiveFactors);
    expect(result.weaknesses).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("puts a [40,60) category's negative factors into weaknesses and recommendations, not warnings", () => {
    const cat = category(50);
    const result = aggregateExplanations([cat]);
    expect(result.weaknesses).toEqual(cat.explanation.negativeFactors);
    expect(result.warnings).toEqual([]);
    expect(result.recommendations).toEqual(cat.explanation.improvementSuggestions);
  });

  it("puts a <40 category's negative factors into warnings, not weaknesses", () => {
    const cat = category(20);
    const result = aggregateExplanations([cat]);
    expect(result.warnings).toEqual(cat.explanation.negativeFactors);
    expect(result.weaknesses).toEqual([]);
    expect(result.recommendations).toEqual(cat.explanation.improvementSuggestions);
  });

  it("puts a [60,90) category's suggestions into improvementOpportunities, not recommendations", () => {
    const cat = category(70);
    const result = aggregateExplanations([cat]);
    expect(result.improvementOpportunities).toEqual(cat.explanation.improvementSuggestions);
    expect(result.recommendations).toEqual([]);
  });

  it("flattens factors from multiple categories in the same band", () => {
    const a = category(85, { positiveFactors: [{ key: "a", params: {} }] });
    const b = category(90, { positiveFactors: [{ key: "b", params: {} }] });
    const result = aggregateExplanations([a, b]);
    expect(result.strengths).toEqual([{ key: "a", params: {} }, { key: "b", params: {} }]);
  });
});
