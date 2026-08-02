import { describe, expect, it } from "vitest";
import { trendFromChangePercent, buildStatistics } from "@/features/finance/aiAnalytics/models";

// A thin smoke test that the barrel actually re-exports real, callable
// values (not just types) from across every model file with no name
// collisions — the more meaningful behavioral coverage lives in each
// model's own *.model.test.ts.
describe("models barrel", () => {
  it("re-exports functions from across different model files", () => {
    expect(trendFromChangePercent(10)).toBe("increasing");
    expect(buildStatistics({ averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null }, [], []).totalTransactions).toBe(0);
  });
});
