import { describe, expect, it } from "vitest";
import { trendFromChangePercent } from "@/features/finance/aiAnalytics/models/enums";

describe("trendFromChangePercent", () => {
  it("is stable for null (no comparable previous period)", () => {
    expect(trendFromChangePercent(null)).toBe("stable");
  });

  it("is stable for exactly 0% change", () => {
    expect(trendFromChangePercent(0)).toBe("stable");
  });

  it("is increasing for positive change", () => {
    expect(trendFromChangePercent(12.5)).toBe("increasing");
  });

  it("is decreasing for negative change", () => {
    expect(trendFromChangePercent(-8)).toBe("decreasing");
  });
});
