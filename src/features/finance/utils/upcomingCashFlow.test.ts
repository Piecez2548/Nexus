import { describe, expect, it } from "vitest";

import { projectUpcomingCashFlow } from "./upcomingCashFlow";
import type { Subscription } from "@/features/finance/types";

const NOW = new Date(2026, 9, 31); // 2026-10-31

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    name: "Rent",
    amount: 1000,
    billingFrequency: "monthly",
    nextBillingDate: "2026-11-05",
    status: "active",
    icon: "home",
    color: "#dc2626",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("projectUpcomingCashFlow", () => {
  it("subtracts bills and adds income due inside the 14-day horizon", () => {
    const result = projectUpcomingCashFlow(
      [sub(), sub({ name: "Salary", amount: 500, kind: "income", nextBillingDate: "2026-11-10" })],
      800,
      NOW
    );

    expect(result).toEqual({ upcomingExpense: 1000, upcomingIncome: 500, projectedBalance: 300 });
  });

  it("ignores occurrences beyond the horizon and non-active subscriptions", () => {
    const result = projectUpcomingCashFlow(
      [sub({ nextBillingDate: "2026-11-20" }), sub({ status: "paused" }), sub({ status: "cancelled" })],
      800,
      NOW
    );

    expect(result).toEqual({ upcomingExpense: 0, upcomingIncome: 0, projectedBalance: 800 });
  });

  it("counts every occurrence of a weekly bill inside the horizon", () => {
    const result = projectUpcomingCashFlow(
      [sub({ amount: 100, billingFrequency: "weekly", nextBillingDate: "2026-11-01" })],
      0,
      NOW
    );

    // Nov 1, 8 (Nov 15 is past the Nov 14 horizon end)
    expect(result.upcomingExpense).toBe(200);
  });

  it("does not double count a past-due subscription whose cycle rolls beyond the horizon", () => {
    const result = projectUpcomingCashFlow([sub({ nextBillingDate: "2026-10-20" })], 800, NOW);

    expect(result.upcomingExpense).toBe(0);
  });
});
