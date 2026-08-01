import { describe, expect, it } from "vitest";
import { estimateAnnualSavings, prioritizeRecommendations, localRecommendationEngine } from "@/features/finance/aiAnalytics/engine/recommendation";

// A thin smoke test that the barrel actually re-exports real, callable
// values from across different files with no name collisions — the more
// meaningful behavioral coverage lives in each file's own *.test.ts.
describe("recommendation engine barrel", () => {
  it("re-exports functions from across different files", () => {
    expect(estimateAnnualSavings(100)).toBe(1200);
    expect(prioritizeRecommendations([])).toEqual([]);
    expect(typeof localRecommendationEngine.generate).toBe("function");
  });
});
