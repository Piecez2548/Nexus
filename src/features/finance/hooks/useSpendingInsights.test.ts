import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSpendingInsights } from "./useSpendingInsights";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

function seed(transactions: Transaction[]) {
  useTransactionStore.setState({ transactions });
}

describe("useSpendingInsights", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 21));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns no insights with no transactions", () => {
    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current).toEqual([]);
  });

  it("flags a category whose spend increased 15%+ vs last month", () => {
    seed([
      { title: "Groceries", amount: 1000, type: "expense", category: "Food", account: "Cash", date: "2026-06-15", status: "completed" },
      { title: "More food", amount: 1200, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id === "category-increase-Food")).toBe(true);
    expect(result.current.find((i) => i.id === "category-increase-Food")?.message).toContain("20%");
  });

  it("does not flag a category whose spend changed less than the threshold", () => {
    seed([
      { title: "Groceries", amount: 1000, type: "expense", category: "Food", account: "Cash", date: "2026-06-15", status: "completed" },
      { title: "More food", amount: 1050, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id === "category-increase-Food")).toBe(false);
  });

  it("flags two distinct recurring titles in the same category as possible duplicate subscriptions", () => {
    seed([
      {
        title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash",
        date: "2026-07-05", status: "completed", recurring: { frequency: "monthly" },
      },
      {
        title: "Netflix Premium", amount: 419, type: "expense", category: "Entertainment", account: "Cash",
        date: "2026-07-10", status: "completed", recurring: { frequency: "monthly" },
      },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id === "duplicate-subscription-Entertainment")).toBe(true);
  });

  it("does not flag a single recurring subscription", () => {
    seed([
      {
        title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash",
        date: "2026-07-05", status: "completed", recurring: { frequency: "monthly" },
      },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id.startsWith("duplicate-subscription"))).toBe(false);
  });

  it("flags a single transaction well above its category's historical average", () => {
    const history: Transaction[] = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      title: `Lunch ${i}`,
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: `2026-06-0${i + 1}`,
      status: "completed",
    }));

    const spike: Transaction = {
      id: 99,
      title: "Big dinner",
      amount: 500,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-10",
      status: "completed",
    };

    seed([...history, spike]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id === "unusual-spend-99")).toBe(true);
  });

  it("does not flag an unusual spend without enough history", () => {
    seed([
      { id: 1, title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-06-01", status: "completed" },
      { id: 2, title: "Big dinner", amount: 500, type: "expense", category: "Food", account: "Cash", date: "2026-07-10", status: "completed" },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id.startsWith("unusual-spend"))).toBe(false);
  });

  it("flags today's total spend when it's well above the recent daily average", () => {
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

    seed([...history, todaySpike]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id === "unusual-daily-spend-2026-07-21")).toBe(true);
  });

  it("does not flag today's spend without enough days of history", () => {
    seed([
      { id: 1, title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
      { id: 2, title: "Big shopping", amount: 300, type: "expense", category: "Shopping", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id.startsWith("unusual-daily-spend"))).toBe(false);
  });

  it("does not flag today's spend when it's in line with the recent average", () => {
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

    const todayNormal: Transaction = {
      id: 99,
      title: "Coffee",
      amount: 110,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    };

    seed([...history, todayNormal]);

    const { result } = renderHook(() => useSpendingInsights());
    expect(result.current.some((i) => i.id.startsWith("unusual-daily-spend"))).toBe(false);
  });

  it("does not crash when a transaction has a missing or malformed date (legacy/corrupt row)", () => {
    seed([
      { title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed" },
      // Simulates a legacy/corrupt row — real Transaction data is never
      // guaranteed to match the compile-time type once it's round-tripped
      // through storage (IndexedDB, sync, import).
      { title: "Bad row", amount: 50, type: "expense", category: "Food", account: "Cash", date: undefined as unknown as string, status: "completed" },
    ]);

    expect(() => renderHook(() => useSpendingInsights())).not.toThrow();
  });
});
