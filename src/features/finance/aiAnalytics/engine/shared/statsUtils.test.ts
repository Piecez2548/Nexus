import { describe, expect, it } from "vitest";
import { coefficientOfVariationScore, signedCoefficientOfVariationScore } from "./statsUtils";

describe("coefficientOfVariationScore", () => {
  it("is null with fewer than 2 active values", () => {
    expect(coefficientOfVariationScore([100, 0, 0], 0.6)).toBeNull();
    expect(coefficientOfVariationScore([], 0.6)).toBeNull();
  });

  it("scores 100 when every value is identical (zero variation)", () => {
    expect(coefficientOfVariationScore([500, 500, 500], 0.6)).toBe(100);
  });

  it("scores lower as variation increases", () => {
    const low = coefficientOfVariationScore([500, 480, 520], 0.6)!;
    const high = coefficientOfVariationScore([500, 100, 900], 0.6)!;
    expect(low).toBeGreaterThan(high);
  });

  it("clamps at 0 when variation exceeds maxCoV", () => {
    expect(coefficientOfVariationScore([1, 1000], 0.1)).toBe(0);
  });
});

describe("signedCoefficientOfVariationScore", () => {
  it("is null when every value is exactly 0 (a brand-new profile)", () => {
    expect(signedCoefficientOfVariationScore([0, 0, 0], 0.5)).toBeNull();
  });

  it("is null with fewer than 2 values", () => {
    expect(signedCoefficientOfVariationScore([500], 0.5)).toBeNull();
  });

  it("scores 100 when every value is identical, including negative", () => {
    expect(signedCoefficientOfVariationScore([-200, -200, -200], 0.5)).toBe(100);
  });

  it("handles a mix of positive and negative net values without a sign-flip artifact", () => {
    const score = signedCoefficientOfVariationScore([500, -300, 400, -100], 0.5);
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores lower as variation increases", () => {
    const low = signedCoefficientOfVariationScore([500, 480, 520], 0.5)!;
    const high = signedCoefficientOfVariationScore([500, -800, 900], 0.5)!;
    expect(low).toBeGreaterThan(high);
  });
});
