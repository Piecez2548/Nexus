import { describe, expect, it } from "vitest";
import { cumulativeBalanceAsOf, lastNMonthRanges, lastNWeekRanges, monthKey, pctChange, sumByType } from "./cashFlowMath";
import type { Transaction } from "@/features/finance/types";

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("monthKey", () => {
  it("formats as YYYY-MM, zero-padded", () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });
});

describe("sumByType", () => {
  it("sums only matching-type transactions", () => {
    const total = sumByType([txn({ type: "income", amount: 500 }), txn({ type: "expense", amount: 200 })], "income");
    expect(total).toBe(500);
  });

  it("filters by range when provided", () => {
    const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
    const total = sumByType([txn({ date: "2026-07-10" }), txn({ date: "2026-08-01" })], "expense", range);
    expect(total).toBe(100);
  });
});

describe("cumulativeBalanceAsOf", () => {
  it("includes income minus expense up to and including the given month", () => {
    const balance = cumulativeBalanceAsOf(
      [txn({ type: "income", amount: 1000, date: "2026-06-01" }), txn({ type: "expense", amount: 300, date: "2026-07-01" })],
      "2026-07",
    );
    expect(balance).toBe(700);
  });

  it("excludes transactions after the given month", () => {
    const balance = cumulativeBalanceAsOf([txn({ type: "income", amount: 1000, date: "2026-08-01" })], "2026-07");
    expect(balance).toBe(0);
  });
});

describe("pctChange", () => {
  it("computes percentage change", () => {
    expect(pctChange(150, 100)).toBe(50);
  });

  it("returns 0 when both are zero", () => {
    expect(pctChange(0, 0)).toBe(0);
  });

  it("returns null when prev is zero but cur is not", () => {
    expect(pctChange(100, 0)).toBeNull();
  });
});

describe("lastNMonthRanges", () => {
  it("returns n months oldest-first, ending with the current month", () => {
    const months = lastNMonthRanges(3, new Date(2026, 6, 15));
    expect(months.map((m) => m.monthKey)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("each range spans the full calendar month", () => {
    const [{ range }] = lastNMonthRanges(1, new Date(2026, 6, 15));
    expect(range.start).toEqual(new Date(2026, 6, 1));
    expect(range.end).toEqual(new Date(2026, 7, 1));
  });

  it("handles crossing a year boundary", () => {
    const months = lastNMonthRanges(3, new Date(2026, 1, 10)); // Feb 2026
    expect(months.map((m) => m.monthKey)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("lastNWeekRanges", () => {
  it("returns n Monday-anchored weeks oldest-first, ending with the current week", () => {
    // Jul 15 2026 is a Wednesday; its Monday-anchored week starts Jul 13.
    const weeks = lastNWeekRanges(3, new Date(2026, 6, 15));
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-06-29", "2026-07-06", "2026-07-13"]);
  });

  it("each range spans exactly 7 days", () => {
    const [{ range }] = lastNWeekRanges(1, new Date(2026, 6, 15));
    expect(range.start).toEqual(new Date(2026, 6, 13));
    expect(range.end).toEqual(new Date(2026, 6, 20));
  });

  it("anchors to the same Monday when now is already a Monday", () => {
    const [{ weekStart }] = lastNWeekRanges(1, new Date(2026, 6, 13)); // a Monday
    expect(weekStart).toBe("2026-07-13");
  });

  it("handles crossing a month boundary", () => {
    const weeks = lastNWeekRanges(2, new Date(2026, 6, 1)); // Wed Jul 1 -> week starts Jun 29
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-06-22", "2026-06-29"]);
  });
});
