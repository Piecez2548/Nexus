import { describe, expect, it } from "vitest";
import { estimateAnnualSavings } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/savingsEstimator";

describe("estimateAnnualSavings", () => {
  it("multiplies monthly savings by 12", () => {
    expect(estimateAnnualSavings(1000)).toBe(12000);
  });

  it("is zero when monthly savings is zero", () => {
    expect(estimateAnnualSavings(0)).toBe(0);
  });
});
