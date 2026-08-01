import { describe, expect, it } from "vitest";
import { forecastConfidence } from "@/features/finance/aiAnalytics/models/forecast.model";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";

function forecast(basis: ForecastResult["futureCashFlowTrend"]["basis"]): ForecastResult {
  return {
    expectedEndOfMonthBalance: 0,
    expectedSavings: 0,
    budgetOverflowRisk: [],
    futureCashFlowTrend: { basis, projectedMonthlyNet: basis === "linearProjection" ? 0 : null },
  };
}

describe("forecastConfidence", () => {
  it("is medium for a linear projection backed by real history", () => {
    expect(forecastConfidence(forecast("linearProjection"))).toBe("medium");
  });

  it("is low when there isn't enough history to project from", () => {
    expect(forecastConfidence(forecast("insufficientData"))).toBe("low");
  });
});
