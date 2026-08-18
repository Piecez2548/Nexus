import { describe, expect, it } from "vitest";

import {
  monthlyEquivalent,
  resolveNextBillingDate,
  advanceOneBillingCycle,
  daysUntil,
  calculateSubscriptionStats,
  reminderFireTime,
} from "./subscriptionMath";
import type { Subscription } from "@/features/finance/types";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    name: "Netflix",
    amount: 419,
    billingFrequency: "monthly",
    nextBillingDate: "2026-08-20",
    status: "active",
    icon: "film",
    color: "#dc2626",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("monthlyEquivalent", () => {
  it("returns the amount unchanged for a monthly subscription", () => {
    expect(monthlyEquivalent(100, "monthly")).toBe(100);
  });

  it("divides a yearly amount by 12", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBeCloseTo(100, 5);
  });

  it("multiplies a weekly amount by ~4.345", () => {
    expect(monthlyEquivalent(100, "weekly")).toBeCloseTo(434.5, 5);
  });

  it("multiplies a daily amount by 30", () => {
    expect(monthlyEquivalent(10, "daily")).toBe(300);
  });
});

describe("resolveNextBillingDate", () => {
  it("returns the stored date unchanged when it's still in the future", () => {
    expect(resolveNextBillingDate("2026-09-01", "monthly", new Date(2026, 7, 18))).toBe("2026-09-01");
  });

  it("returns the stored date unchanged when it's exactly today", () => {
    expect(resolveNextBillingDate("2026-08-18", "monthly", new Date(2026, 7, 18))).toBe("2026-08-18");
  });

  it("rolls a monthly subscription forward past a single missed cycle", () => {
    // Stored date is a month behind "today" -- should advance exactly once.
    expect(resolveNextBillingDate("2026-07-18", "monthly", new Date(2026, 7, 18))).toBe("2026-08-18");
  });

  it("rolls forward multiple missed cycles (e.g. an old subscription reopened after months)", () => {
    // Jan 15 -> Feb 15 -> ... -> Aug 15 (still before Aug 18 "today") -> Sep 15.
    expect(resolveNextBillingDate("2026-01-15", "monthly", new Date(2026, 7, 18))).toBe("2026-09-15");
  });

  it("handles the end-of-month edge case correctly via date-fns (Jan 31 + monthly -> Feb 28, not Mar 3)", () => {
    // 2026 is not a leap year, so Jan 31 + 1 month clamps to Feb 28.
    expect(resolveNextBillingDate("2026-01-31", "monthly", new Date(2026, 1, 1))).toBe("2026-02-28");
  });

  it("rolls a weekly subscription forward correctly", () => {
    expect(resolveNextBillingDate("2026-08-01", "weekly", new Date(2026, 7, 18))).toBe("2026-08-22");
  });

  it("rolls a yearly subscription forward correctly", () => {
    // Aug 1 2024 -> Aug 1 2025 -> Aug 1 2026 (still before Aug 18 "today") -> Aug 1 2027.
    expect(resolveNextBillingDate("2024-08-01", "yearly", new Date(2026, 7, 18))).toBe("2027-08-01");
  });

  it("rolls a daily subscription forward correctly", () => {
    expect(resolveNextBillingDate("2026-08-10", "daily", new Date(2026, 7, 18))).toBe("2026-08-18");
  });
});

describe("advanceOneBillingCycle", () => {
  it("advances a monthly date by exactly one month", () => {
    expect(advanceOneBillingCycle("2026-08-15", "monthly")).toBe("2026-09-15");
  });

  it("handles the end-of-month edge case (Jan 31 -> Feb 28)", () => {
    expect(advanceOneBillingCycle("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("advances a weekly date by 7 days", () => {
    expect(advanceOneBillingCycle("2026-08-01", "weekly")).toBe("2026-08-08");
  });

  it("advances a yearly date by one year", () => {
    expect(advanceOneBillingCycle("2026-08-18", "yearly")).toBe("2027-08-18");
  });

  it("advances a daily date by one day", () => {
    expect(advanceOneBillingCycle("2026-08-18", "daily")).toBe("2026-08-19");
  });
});

describe("reminderFireTime", () => {
  it("fires at 09:00 local, one day before the billing date", () => {
    const at = reminderFireTime("2026-08-20");
    expect(at.getFullYear()).toBe(2026);
    expect(at.getMonth()).toBe(7); // August, 0-indexed
    expect(at.getDate()).toBe(19);
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(0);
  });

  it("handles a month boundary correctly (Mar 1 -> Feb 28/29)", () => {
    const at = reminderFireTime("2026-03-01");
    expect(at.getMonth()).toBe(1); // February
    expect(at.getDate()).toBe(28);
  });
});

describe("daysUntil", () => {
  it("returns 0 for today", () => {
    expect(daysUntil("2026-08-18", new Date(2026, 7, 18))).toBe(0);
  });

  it("returns a positive count for a future date", () => {
    expect(daysUntil("2026-08-25", new Date(2026, 7, 18))).toBe(7);
  });

  it("returns a negative count for a past date (reported honestly, not clamped)", () => {
    expect(daysUntil("2026-08-10", new Date(2026, 7, 18))).toBe(-8);
  });
});

describe("calculateSubscriptionStats", () => {
  it("returns all zeros for an empty list", () => {
    expect(calculateSubscriptionStats([])).toEqual({
      activeCount: 0,
      pausedCount: 0,
      cancelledCount: 0,
      totalMonthly: 0,
      totalYearly: 0,
    });
  });

  it("counts only active subscriptions toward the monthly/yearly total", () => {
    const stats = calculateSubscriptionStats([
      subscription({ status: "active", amount: 100, billingFrequency: "monthly" }),
      subscription({ status: "paused", amount: 500, billingFrequency: "monthly" }),
      subscription({ status: "cancelled", amount: 999, billingFrequency: "monthly" }),
    ]);

    expect(stats.activeCount).toBe(1);
    expect(stats.pausedCount).toBe(1);
    expect(stats.cancelledCount).toBe(1);
    expect(stats.totalMonthly).toBe(100);
    expect(stats.totalYearly).toBe(1200);
  });

  it("sums multiple active subscriptions across different frequencies", () => {
    const stats = calculateSubscriptionStats([
      subscription({ status: "active", amount: 100, billingFrequency: "monthly" }),
      subscription({ status: "active", amount: 1200, billingFrequency: "yearly" }),
    ]);

    expect(stats.totalMonthly).toBeCloseTo(200, 5);
  });

  it("a status transition (active -> paused) removes a subscription from the total without deleting it", () => {
    const active = calculateSubscriptionStats([subscription({ status: "active", amount: 300 })]);
    const paused = calculateSubscriptionStats([subscription({ status: "paused", amount: 300 })]);

    expect(active.totalMonthly).toBe(300);
    expect(paused.totalMonthly).toBe(0);
    expect(paused.pausedCount).toBe(1);
  });
});
