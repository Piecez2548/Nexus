import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useExpenseByCategory } from "./useExpenseByCategory";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

function seed(transactions: Transaction[]) {
  useTransactionStore.setState({ transactions });
}

describe("useExpenseByCategory", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [], loading: false });
  });

  it("returns an empty array with no transactions", () => {
    const { result } = renderHook(() => useExpenseByCategory());
    expect(result.current).toEqual([]);
  });

  it("ignores income and sums expenses per category", () => {
    seed([
      { title: "Salary", amount: 1000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-02", status: "completed" },
      { title: "Dinner", amount: 250, type: "expense", category: "Food", account: "Cash", date: "2026-07-03", status: "completed" },
      { title: "Bus", amount: 40, type: "expense", category: "Transport", account: "Cash", date: "2026-07-04", status: "completed" },
    ]);

    const { result } = renderHook(() => useExpenseByCategory());

    expect(result.current).toEqual([
      { name: "Food", value: 350 },
      { name: "Transport", value: 40 },
    ]);
  });
});
