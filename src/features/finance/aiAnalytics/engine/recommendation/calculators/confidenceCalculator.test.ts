import { describe, expect, it } from "vitest";
import { calculateConfidence } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/confidenceCalculator";
import type { Recommendation, RecommendationConfidence, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function rec(priority: RecommendationPriority, confidence: RecommendationConfidence): Recommendation {
  return {
    id: "test",
    key: "test",
    priority,
    estimatedMonthlySavings: 0,
    confidence,
    estimatedImpact: null,
    params: {},
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "action", params: {} },
  };
}

describe("calculateConfidence", () => {
  it("is a flat 95 for information-priority recommendations regardless of their tier or data quality", () => {
    expect(calculateConfidence(rec("information", "low"), 3, false)).toBe(95);
    expect(calculateConfidence(rec("information", "high"), 0, true)).toBe(95);
  });

  it("uses the base tier value at the 3-month history baseline with no priority adjustment", () => {
    expect(calculateConfidence(rec("medium", "high"), 3, false)).toBe(85);
    expect(calculateConfidence(rec("medium", "medium"), 3, false)).toBe(60);
    expect(calculateConfidence(rec("medium", "low"), 3, false)).toBe(35);
  });

  it("nudges up for critical priority and down for low priority", () => {
    expect(calculateConfidence(rec("critical", "high"), 3, false)).toBe(90);
    expect(calculateConfidence(rec("low", "high"), 3, false)).toBe(80);
  });

  it("increases with more months of history, capped at +10", () => {
    expect(calculateConfidence(rec("medium", "medium"), 8, false)).toBe(70); // 60 + 10, capped
    expect(calculateConfidence(rec("medium", "medium"), 6, false)).toBe(66); // 60 + 6
  });

  it("decreases with less history, capped at -10", () => {
    expect(calculateConfidence(rec("medium", "medium"), 0, false)).toBe(54); // 60 - 6
    expect(calculateConfidence(rec("medium", "medium"), -10, false)).toBe(50); // 60 - 10, capped
  });

  it("applies a further penalty when the overall profile is data-insufficient", () => {
    expect(calculateConfidence(rec("medium", "medium"), 3, true)).toBe(50); // 60 - 10
  });

  it("never returns a value outside 0-100", () => {
    expect(calculateConfidence(rec("low", "low"), -100, true)).toBeGreaterThanOrEqual(0);
    expect(calculateConfidence(rec("critical", "high"), 1000, false)).toBeLessThanOrEqual(100);
  });
});
