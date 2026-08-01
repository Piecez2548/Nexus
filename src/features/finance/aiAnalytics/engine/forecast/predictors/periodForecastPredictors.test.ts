import { describe, expect, it } from "vitest";
import { computeMonthlyForecast } from "./monthlyForecastPredictor";
import { computeWeeklyForecast } from "./weeklyForecastPredictor";
import { computeYearlyForecast } from "./yearlyForecastPredictor";

const now = new Date(2026, 6, 15);

describe("period forecast predictor wrappers", () => {
  it("computeMonthlyForecast fixes period to monthly", () => {
    expect(computeMonthlyForecast([], 3, false, now).period).toBe("monthly");
  });

  it("computeWeeklyForecast fixes period to weekly", () => {
    expect(computeWeeklyForecast([], 3, false, now).period).toBe("weekly");
  });

  it("computeYearlyForecast fixes period to yearly", () => {
    expect(computeYearlyForecast([], 3, false, now).period).toBe("yearly");
  });
});
