import { describe, expect, it } from "vitest";
import { calculateCoachConfidence } from "./coachConfidenceCalculator";

describe("calculateCoachConfidence", () => {
  it("blends classifier and answer confidence with the documented 0.3/0.7 weights", () => {
    expect(calculateCoachConfidence(80, 90)).toBe(Math.round(80 * 0.3 + 90 * 0.7));
  });

  it("weights the answer confidence more heavily than the classifier confidence", () => {
    const highAnswer = calculateCoachConfidence(50, 90);
    const highClassifier = calculateCoachConfidence(90, 50);
    expect(highAnswer).toBeGreaterThan(highClassifier);
  });

  it("is 0 when both inputs are 0", () => {
    expect(calculateCoachConfidence(0, 0)).toBe(0);
  });

  it("is 100 when both inputs are 100", () => {
    expect(calculateCoachConfidence(100, 100)).toBe(100);
  });

  it("always clamps within 0-100", () => {
    expect(calculateCoachConfidence(95, 90)).toBeLessThanOrEqual(100);
    expect(calculateCoachConfidence(0, 0)).toBeGreaterThanOrEqual(0);
  });
});
