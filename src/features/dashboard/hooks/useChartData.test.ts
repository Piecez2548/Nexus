import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useChartData } from "./useChartData";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

const NOW = new Date("2026-07-24T12:00:00.000Z");

function seed(transactions: Transaction[]) {
  useTransactionStore.setState({ transactions });
}

describe("useChartData", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [], loading: false });
  });

  it("returns a 14-day rolling window of zeroed days when there are no transactions", () => {
    const { result } = renderHook(() => useChartData(NOW));

    expect(result.current).toHaveLength(14);
    expect(result.current[0].date).toBe("2026-07-11");
    expect(result.current[13].date).toBe("2026-07-24");
    expect(result.current.every((d) => d.income === 0 && d.expense === 0)).toBe(true);
  });

  it("groups transactions by day within the window, ignoring type other than income/expense sums", () => {
    seed([
      { title: "Salary", amount: 1000, type: "income", category: "Salary", account: "Bank", date: "2026-07-23", status: "completed" },
      { title: "Food", amount: 200, type: "expense", category: "Food", account: "Cash", date: "2026-07-23", status: "completed" },
      { title: "Bonus", amount: 500, type: "income", category: "Salary", account: "Bank", date: "2026-07-24", status: "completed" },
    ]);

    const { result } = renderHook(() => useChartData(NOW));

    const day23 = result.current.find((d) => d.date === "2026-07-23");
    const day24 = result.current.find((d) => d.date === "2026-07-24");
    expect(day23).toEqual({ date: "2026-07-23", income: 1000, expense: 200, balance: 800 });
    expect(day24).toEqual({ date: "2026-07-24", income: 500, expense: 0, balance: 1300 });
  });

  it("excludes transactions older than the 14-day window from the daily sums, but still carries them into the running balance", () => {
    seed([
      { title: "Old rent", amount: 8000, type: "expense", category: "Housing", account: "Bank", date: "2026-06-01", status: "completed" },
    ]);

    const { result } = renderHook(() => useChartData(NOW));

    expect(result.current.every((d) => d.expense === 0)).toBe(true);
    expect(result.current.every((d) => d.balance === -8000)).toBe(true);
  });

  it("returns a single bucket for the selected day when granularity is 'day'", () => {
    seed([
      { title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-24", status: "completed" },
      { title: "Yesterday", amount: 999, type: "expense", category: "Food", account: "Cash", date: "2026-07-23", status: "completed" },
    ]);

    const { result } = renderHook(() => useChartData(NOW, "day"));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({ date: "2026-07-24", income: 0, expense: 100, balance: -999 - 100 });
  });

  it("returns one bucket per day in the calendar month when granularity is 'month'", () => {
    const { result } = renderHook(() => useChartData(NOW, "month"));

    expect(result.current).toHaveLength(31); // July has 31 days
    expect(result.current[0].date).toBe("2026-07-01");
    expect(result.current[30].date).toBe("2026-07-31");
  });

  it("returns one bucket per month across the calendar year when granularity is 'year'", () => {
    seed([
      { title: "Jan income", amount: 1000, type: "income", category: "Salary", account: "Bank", date: "2026-01-15", status: "completed" },
      { title: "Jul income", amount: 2000, type: "income", category: "Salary", account: "Bank", date: "2026-07-05", status: "completed" },
    ]);

    const { result } = renderHook(() => useChartData(NOW, "year"));

    expect(result.current).toHaveLength(12);
    expect(result.current[0].date).toBe("2026-01-01");
    expect(result.current[0].income).toBe(1000);
    expect(result.current[6].date).toBe("2026-07-01");
    expect(result.current[6].income).toBe(2000);
  });
});
