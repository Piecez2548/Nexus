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
});
