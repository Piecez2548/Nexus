import { describe, expect, it } from "vitest";
import { computeAnswerConfidence } from "./answerConfidenceCalculator";

describe("computeAnswerConfidence", () => {
  it("is the default 90 for a fully-supported, non-degenerate answer", () => {
    expect(computeAnswerConfidence({ hasData: true })).toBe(90);
  });

  it("is 0 when there's genuinely no data to work with", () => {
    expect(computeAnswerConfidence({ hasData: false })).toBe(0);
    expect(computeAnswerConfidence({ hasData: false, ceiling: 100 })).toBe(0);
  });

  it("applies the insufficientData penalty", () => {
    expect(computeAnswerConfidence({ hasData: true, insufficientData: true })).toBe(90 - 25);
  });

  it("applies the thin-sample penalty below the threshold", () => {
    expect(computeAnswerConfidence({ hasData: true, sampleSize: 1 })).toBe(90 - 15);
    expect(computeAnswerConfidence({ hasData: true, sampleSize: 2 })).toBe(90 - 15);
  });

  it("does not apply the thin-sample penalty at or above the threshold", () => {
    expect(computeAnswerConfidence({ hasData: true, sampleSize: 3 })).toBe(90);
    expect(computeAnswerConfidence({ hasData: true, sampleSize: 10 })).toBe(90);
  });

  it("stacks the insufficientData and thin-sample penalties", () => {
    expect(computeAnswerConfidence({ hasData: true, insufficientData: true, sampleSize: 1 })).toBe(90 - 25 - 15);
  });

  it("caps the result at the honesty-path ceiling even when otherwise higher", () => {
    expect(computeAnswerConfidence({ hasData: true, ceiling: 65 })).toBe(65);
  });

  it("the ceiling is an upper bound — penalties can still push the result below it", () => {
    // base 90 - 25 - 15 = 50, then min(50, ceiling 65) = 50 (ceiling doesn't bind here).
    expect(computeAnswerConfidence({ hasData: true, insufficientData: true, sampleSize: 1, ceiling: 65 })).toBe(50);
  });

  it("never goes negative even with every penalty stacked", () => {
    const result = computeAnswerConfidence({ hasData: true, insufficientData: true, sampleSize: 1, ceiling: 0 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBe(0);
  });
});
