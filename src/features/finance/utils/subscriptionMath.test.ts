import { describe, expect, it } from "vitest";

import {
  monthlyEquivalent,
  resolveNextBillingDate,
  advanceOneBillingCycle,
  anchorDayFromNextBillingDate,
  resolveBillingAnchorDay,
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

  // Regression (BUG-12): rolling forward several missed monthly cycles used
  // to compound the end-of-month clamp instead of recovering the original
  // billing day once the calendar allowed it again.
  it("threads the billing anchor through multiple rolled-forward cycles (31 Jan, rolled to May, lands on the 31st again, not the 28th)", () => {
    expect(resolveNextBillingDate("2026-01-31", "monthly", new Date(2026, 4, 1), 31)).toBe("2026-05-31");
  });

  it("resolves the anchor from nextBillingDate's own day when none is stored, still avoiding compounded drift within this one call", () => {
    // Same as above but with no explicit billingAnchorDay -- the anchor is
    // still resolved once, from the ORIGINAL (undrifted) input date, and
    // held fixed for the whole loop, rather than being re-derived from
    // each iteration's already-clamped result.
    expect(resolveNextBillingDate("2026-01-31", "monthly", new Date(2026, 4, 1))).toBe("2026-05-31");
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

  // Regression (BUG-12): the billing anchor must survive a clamped month,
  // not get silently rebased to whatever day the clamp landed on. This is
  // the exact worked example from the bug report: 31 Jan -> 28 Feb (an
  // unavoidable single clamp -- nobody could have "Feb 31") -> 31 Mar (the
  // true anchor recovered the moment March allows it) -> 30 Apr (April has
  // no 31st either) -> 31 May.
  it("preserves the true billing anchor across a run of months with different lengths (31 Jan -> 28 Feb -> 31 Mar -> 30 Apr -> 31 May)", () => {
    const anchor = 31;
    const feb = advanceOneBillingCycle("2026-01-31", "monthly", anchor);
    const mar = advanceOneBillingCycle(feb, "monthly", anchor);
    const apr = advanceOneBillingCycle(mar, "monthly", anchor);
    const may = advanceOneBillingCycle(apr, "monthly", anchor);

    expect(feb).toBe("2026-02-28");
    expect(mar).toBe("2026-03-31");
    expect(apr).toBe("2026-04-30");
    expect(may).toBe("2026-05-31");
  });

  it("without a threaded anchor, chaining from the already-clamped result compounds the drift (the exact bug this fixes)", () => {
    // Same starting point as above, but re-deriving the anchor from each
    // step's own (already-clamped) day instead of threading the original
    // 31 through -- this is what the code did before BUG-12, kept here as
    // a characterization test so the contrast with the fix above is explicit.
    const feb = advanceOneBillingCycle("2026-01-31", "monthly");
    const mar = advanceOneBillingCycle(feb, "monthly");
    const apr = advanceOneBillingCycle(mar, "monthly");

    expect(feb).toBe("2026-02-28");
    expect(mar).toBe("2026-03-28"); // wrong -- should be 31
    expect(apr).toBe("2026-04-28"); // wrong -- should be 30, stuck at 28 forever
  });

  it("recovers a leap-year Feb 29 anchor exactly when the calendar next allows it (yearly)", () => {
    const anchor = 29;
    const y2025 = advanceOneBillingCycle("2024-02-29", "yearly", anchor); // 2024 leap -> 2025 not leap
    const y2026 = advanceOneBillingCycle(y2025, "yearly", anchor);
    const y2027 = advanceOneBillingCycle(y2026, "yearly", anchor);
    const y2028 = advanceOneBillingCycle(y2027, "yearly", anchor); // 2028 is leap again

    expect(y2025).toBe("2025-02-28");
    expect(y2026).toBe("2026-02-28");
    expect(y2027).toBe("2027-02-28");
    expect(y2028).toBe("2028-02-29");
  });

  it("handles a non-clamping run across a year boundary correctly (30 Nov -> 30 Dec -> 30 Jan)", () => {
    const anchor = 30;
    const dec = advanceOneBillingCycle("2026-11-30", "monthly", anchor);
    const jan = advanceOneBillingCycle(dec, "monthly", anchor);

    expect(dec).toBe("2026-12-30");
    expect(jan).toBe("2027-01-30");
  });

  it("ignores an anchorDay for weekly/daily -- day-of-month has no meaning there", () => {
    expect(advanceOneBillingCycle("2026-08-01", "weekly", 99)).toBe("2026-08-08");
    expect(advanceOneBillingCycle("2026-08-18", "daily", 99)).toBe("2026-08-19");
  });
});

describe("anchorDayFromNextBillingDate", () => {
  it("returns the day-of-month of the given date", () => {
    expect(anchorDayFromNextBillingDate("2026-01-31")).toBe(31);
    expect(anchorDayFromNextBillingDate("2026-02-05")).toBe(5);
  });
});

describe("resolveBillingAnchorDay", () => {
  it("uses the stored billingAnchorDay when present", () => {
    expect(resolveBillingAnchorDay("2026-02-28", 31)).toBe(31);
  });

  it("falls back to nextBillingDate's own day when billingAnchorDay is absent (a legacy subscription)", () => {
    expect(resolveBillingAnchorDay("2026-02-28", undefined)).toBe(28);
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
