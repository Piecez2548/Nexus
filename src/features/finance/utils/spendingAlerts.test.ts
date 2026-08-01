import { describe, expect, it } from "vitest";
import { generateSpendingAlerts } from "./spendingAlerts";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21, local

describe("generateSpendingAlerts", () => {
  it("returns no insights with no transactions", () => {
    expect(generateSpendingAlerts([], now)).toEqual([]);
  });

  it("flags a category whose spend increased 15%+ vs last month", () => {
    const alerts = generateSpendingAlerts(
      [
        { title: "Groceries", amount: 1000, type: "expense", category: "Food", account: "Cash", date: "2026-06-15", status: "completed" },
        { title: "More food", amount: 1200, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
      ],
      now,
    );
    expect(alerts.some((i) => i.id === "category-increase-Food")).toBe(true);
  });

  it("uses the local calendar date for 'today', not UTC", () => {
    // 23:30 local on 2026-07-21 — a UTC-based implementation using
    // toISOString().slice(0,10) could roll this to 2026-07-22 in a
    // timezone ahead of UTC, missing the "today" bucket entirely.
    const lateNow = new Date(2026, 6, 21, 23, 30);
    const history: Transaction[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Day ${i}`,
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: `2026-07-1${i}`,
      status: "completed",
    }));
    const todaySpike: Transaction = {
      id: 99,
      title: "Big shopping",
      amount: 300,
      type: "expense",
      category: "Shopping",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    };

    const alerts = generateSpendingAlerts([...history, todaySpike], lateNow);
    expect(alerts.some((i) => i.id === "unusual-daily-spend-2026-07-21")).toBe(true);
  });

  it("does not crash on a transaction with a missing or malformed date", () => {
    expect(() =>
      generateSpendingAlerts(
        [
          { title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
          { title: "Bad row", amount: 50, type: "expense", category: "Food", account: "Cash", date: undefined as unknown as string, status: "completed" },
        ],
        now,
      ),
    ).not.toThrow();
  });
});
