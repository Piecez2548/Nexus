import { describe, expect, it } from "vitest";
import { calculateForecastConfidence } from "./forecastConfidenceCalculator";

describe("calculateForecastConfidence", () => {
  it("returns the baseline-ish score at 3 months of history, neutral stability, sufficient data", () => {
    expect(calculateForecastConfidence(3, 50, false)).toBe(50);
  });

  it("rewards more months of history", () => {
    const short = calculateForecastConfidence(1, 50, false);
    const long = calculateForecastConfidence(9, 50, false);
    expect(long).toBeGreaterThan(short);
  });

  it("rewards a higher stability score", () => {
    const unstable = calculateForecastConfidence(3, 10, false);
    const stable = calculateForecastConfidence(3, 90, false);
    expect(stable).toBeGreaterThan(unstable);
  });

  it("penalizes a missing stability signal", () => {
    const withSignal = calculateForecastConfidence(3, 50, false);
    const noSignal = calculateForecastConfidence(3, null, false);
    expect(noSignal).toBeLessThan(withSignal);
  });

  it("penalizes insufficientData", () => {
    const sufficient = calculateForecastConfidence(6, 60, false);
    const insufficient = calculateForecastConfidence(6, 60, true);
    expect(insufficient).toBeLessThan(sufficient);
  });

  it("always clamps within 0-100", () => {
    expect(calculateForecastConfidence(0, 0, true)).toBeGreaterThanOrEqual(0);
    expect(calculateForecastConfidence(60, 100, false)).toBeLessThanOrEqual(100);
  });
});
