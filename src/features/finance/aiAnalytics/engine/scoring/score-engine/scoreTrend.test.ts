import { describe, expect, it } from "vitest";
import { computeScoreTrend, defaultTrendPoints } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/scoreTrend";
import type { ScoreContextInput } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/buildScoreContext";

const now = new Date(2026, 6, 30); // 2026-07-30

function input(overrides: Partial<ScoreContextInput> = {}): ScoreContextInput {
  return { transactions: [], budgets: [], goals: [], recipientProfiles: [], goalMilestoneEvents: [], ...overrides };
}

describe("defaultTrendPoints", () => {
  it("returns 6 points, oldest first, ending with `now` itself", () => {
    const points = defaultTrendPoints(now);
    expect(points).toHaveLength(6);
    expect(points[points.length - 1]).toEqual({ label: "now", now });
    expect(points.map((p) => p.label)).toEqual(["oneYearAgo", "sixMonthsAgo", "threeMonthsAgo", "oneMonthAgo", "oneWeekAgo", "now"]);
  });

  it("spaces each point strictly further in the past than the one after it", () => {
    const points = defaultTrendPoints(now);
    for (let i = 1; i < points.length; i++) {
      expect(points[i - 1].now.getTime()).toBeLessThan(points[i].now.getTime());
    }
  });

  it("computes oneWeekAgo as exactly 7 days before now", () => {
    const points = defaultTrendPoints(now);
    const oneWeekAgo = points.find((p) => p.label === "oneWeekAgo")!;
    const diffDays = (now.getTime() - oneWeekAgo.now.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(7);
  });
});

describe("computeScoreTrend", () => {
  it("returns one result per requested point, with the label and now carried through", () => {
    const points = [
      { label: "a", now: new Date(2026, 0, 31) },
      { label: "b", now },
    ];
    const results = computeScoreTrend(input(), points);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ label: "a", now: points[0].now });
    expect(results[1]).toMatchObject({ label: "b", now: points[1].now });
  });

  it("reflects the transaction history as it stood at each historical point, not just the latest state", () => {
    const transactions = [
      { title: "Salary", amount: 30000, type: "income" as const, account: "Bank", date: "2026-01-10" },
      { title: "Food", amount: 1000, type: "expense" as const, account: "Cash", date: "2026-01-15" },
    ];
    const points = [
      { label: "beforeAnyData", now: new Date(2025, 11, 31) },
      { label: "afterData", now: new Date(2026, 0, 31) },
    ];
    const results = computeScoreTrend(input({ transactions }), points);

    expect(results[0].overallScore).toBeNull(); // no transactions exist yet as of this point
    expect(results[1].overallScore).not.toBeNull();
  });
});
