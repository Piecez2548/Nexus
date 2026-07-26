import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useDashboard } from "./useDashboard";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

const NOW = new Date(2026, 6, 21); // 2026-07-21

function seed(transactions: Transaction[]) {
  useTransactionStore.setState({ transactions });
}

describe("useDashboard", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [], loading: false });
  });

  it("returns zeroed values with no transactions", () => {
    const { result } = renderHook(() => useDashboard(NOW));

    expect(result.current).toEqual({
      income: 0,
      expense: 0,
      balance: 0,
      saving: 0,
      changes: { income: 0, expense: 0, saving: 0, balance: 0 },
      monthly: {
        current: { income: 0, expense: 0, saving: 0 },
        previous: { income: 0, expense: 0, saving: 0 },
      },
    });
  });

  it("sums income and expense separately", () => {
    seed([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Rent", amount: 8000, type: "expense", category: "Housing", account: "Bank", date: "2026-07-02", status: "completed" },
      { title: "Food", amount: 1500, type: "expense", category: "Food", account: "Cash", date: "2026-07-03", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW));

    expect(result.current.income).toBe(30000);
    expect(result.current.expense).toBe(9500);
    expect(result.current.balance).toBe(20500);
    expect(result.current.saving).toBe(20500);
  });

  it("recomputes when the transaction list changes", () => {
    const { result, rerender } = renderHook(() => useDashboard(NOW));

    expect(result.current.balance).toBe(0);

    seed([
      { title: "Salary", amount: 1000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
    ]);
    rerender();

    expect(result.current.balance).toBe(1000);
  });

  it("computes month-over-month % change for income, expense, and saving", () => {
    seed([
      // Previous month (June 2026)
      { title: "Salary", amount: 20000, type: "income", category: "Salary", account: "Bank", date: "2026-06-01", status: "completed" },
      { title: "Rent", amount: 8000, type: "expense", category: "Housing", account: "Bank", date: "2026-06-02", status: "completed" },
      // Current month (July 2026)
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Rent", amount: 4000, type: "expense", category: "Housing", account: "Bank", date: "2026-07-02", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW));

    // Income: 20000 -> 30000 = +50%
    expect(result.current.changes.income).toBe(50);
    // Expense: 8000 -> 4000 = -50%
    expect(result.current.changes.expense).toBe(-50);
    // Saving: 12000 -> 26000 = +116.67%
    expect(result.current.changes.saving).toBeCloseTo(116.67, 1);

    expect(result.current.monthly).toEqual({
      current: { income: 30000, expense: 4000, saving: 26000 },
      previous: { income: 20000, expense: 8000, saving: 12000 },
    });
  });

  it("returns null change when there is no prior-month data to compare", () => {
    seed([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW));

    expect(result.current.changes.income).toBeNull();
    expect(result.current.changes.expense).toBe(0);
  });

  it("scopes income/expense/saving to the selected granularity, while balance stays all-time", () => {
    seed([
      // Previous month (June 2026) — should count toward all-time balance
      // but NOT toward the current period's income/expense/saving.
      { title: "Salary", amount: 20000, type: "income", category: "Salary", account: "Bank", date: "2026-06-01", status: "completed" },
      { title: "Rent", amount: 8000, type: "expense", category: "Housing", account: "Bank", date: "2026-06-02", status: "completed" },
      // Current month (July 2026)
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Rent", amount: 4000, type: "expense", category: "Housing", account: "Bank", date: "2026-07-02", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW, "month"));

    // Period-scoped: only July's figures.
    expect(result.current.income).toBe(30000);
    expect(result.current.expense).toBe(4000);
    expect(result.current.saving).toBe(26000);

    // All-time, unaffected by granularity: both June and July combined.
    expect(result.current.balance).toBe(20000 - 8000 + 30000 - 4000);
  });

  it("narrows to a single day under 'day' granularity", () => {
    seed([
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW, "day"));

    expect(result.current.income).toBe(0);
    expect(result.current.expense).toBe(100);
  });

  it("widens to the full calendar year under 'year' granularity", () => {
    seed([
      { title: "Salary", amount: 20000, type: "income", category: "Salary", account: "Bank", date: "2026-01-15", status: "completed" },
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Salary", amount: 99999, type: "income", category: "Salary", account: "Bank", date: "2025-12-31", status: "completed" },
    ]);

    const { result } = renderHook(() => useDashboard(NOW, "year"));

    expect(result.current.income).toBe(50000);
  });
});
