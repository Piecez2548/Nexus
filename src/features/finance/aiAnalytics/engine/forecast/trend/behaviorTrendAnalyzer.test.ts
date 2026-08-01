import { describe, expect, it } from "vitest";
import { analyzeBehaviorTrends } from "./behaviorTrendAnalyzer";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { DomainTrendPoint } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 15);

function subscription(overrides: Partial<SubscriptionEntry>): SubscriptionEntry {
  return {
    normalizedTitle: "netflix",
    representativeTitle: "Netflix",
    category: "Entertainment",
    averageAmount: 200,
    occurrenceCount: 3,
    lastDate: "2026-07-01",
    averageIntervalDays: 30,
    lastAmount: 200,
    previousAmount: 200,
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction>): Transaction {
  return { title: "x", amount: 0, type: "expense", account: "Cash", date: "2026-07-05", status: "completed", ...overrides };
}

describe("analyzeBehaviorTrends", () => {
  it("reads restaurant/coffee/shopping trend directly from Prompt 007's already-computed monthlyTrend series", () => {
    const rising: DomainTrendPoint[] = [
      { periodKey: "2026-04", amount: 100 },
      { periodKey: "2026-05", amount: 150 },
      { periodKey: "2026-06", amount: 200 },
      { periodKey: "2026-07", amount: 250 },
    ];
    const result = analyzeBehaviorTrends(rising, [], [], [], [], now);
    const restaurant = result.entries.find((e) => e.domain === "restaurant")!;
    expect(restaurant.direction).toBe("increasing");
    expect(restaurant.changePercent).toBeCloseTo(25, 1);
  });

  it("classifies increasing subscription cost from a genuine 2-point comparison", () => {
    const subscriptions = [subscription({ lastAmount: 300, previousAmount: 200 })];
    const result = analyzeBehaviorTrends([], [], [], subscriptions, [], now);
    const entry = result.entries.find((e) => e.domain === "subscriptionCost")!;
    expect(entry.direction).toBe("increasing");
    expect(entry.changePercent).toBeCloseTo(50, 1);
  });

  it("classifies a small subscription cost fluctuation as stable", () => {
    const subscriptions = [subscription({ lastAmount: 205, previousAmount: 200 })];
    const result = analyzeBehaviorTrends([], [], [], subscriptions, [], now);
    const entry = result.entries.find((e) => e.domain === "subscriptionCost")!;
    expect(entry.direction).toBe("stable");
  });

  it("is insufficientData for subscriptionCost with zero subscriptions", () => {
    const result = analyzeBehaviorTrends([], [], [], [], [], now);
    const entry = result.entries.find((e) => e.domain === "subscriptionCost")!;
    expect(entry.direction).toBe("insufficientData");
  });

  it("computes weekendSpending from a new local multi-month weekend-only bucketing helper", () => {
    const transactions: Transaction[] = [
      tx({ amount: 100, date: "2026-04-05" }), // Sunday
      tx({ amount: 150, date: "2026-05-03" }), // Sunday
      tx({ amount: 200, date: "2026-06-07" }), // Sunday
      tx({ amount: 250, date: "2026-07-05" }), // Sunday
      tx({ amount: 999, date: "2026-07-08" }), // Wednesday — must be excluded
    ];
    const result = analyzeBehaviorTrends([], [], [], [], transactions, now);
    const weekend = result.entries.find((e) => e.domain === "weekendSpending")!;
    expect(weekend.direction).toBe("increasing");
    expect(weekend.changePercent).toBeCloseTo(25, 1);
  });

  it("always returns exactly 5 entries, one per BehaviorTrendDomain", () => {
    const result = analyzeBehaviorTrends([], [], [], [], [], now);
    expect(result.entries).toHaveLength(5);
    expect(result.entries.map((e) => e.domain).sort()).toEqual(["coffee", "restaurant", "shopping", "subscriptionCost", "weekendSpending"].sort());
  });
});
