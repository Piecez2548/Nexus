import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useBudgetProgress } from "./useBudgetProgress";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import type { Transaction, Budget } from "@/features/finance/types";

const today = new Date().toISOString().slice(0, 10);

describe("useBudgetProgress", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
    useBudgetStore.setState({ budgets: [] });
  });

  it("returns an empty array with no budgets", () => {
    const { result } = renderHook(() => useBudgetProgress());
    expect(result.current).toEqual([]);
  });

  it("computes spend within the current period against the budget", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 1000, period: "monthly" };
    useBudgetStore.setState({ budgets: [budget] });

    const transactions: Transaction[] = [
      { title: "Lunch", amount: 300, type: "expense", category: "Food", account: "Cash", date: today, status: "completed" },
      { title: "Dinner", amount: 200, type: "expense", category: "Food", account: "Cash", date: today, status: "completed" },
      { title: "Bus", amount: 50, type: "expense", category: "Transport", account: "Cash", date: today, status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    const { result } = renderHook(() => useBudgetProgress());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].spent).toBe(500);
    expect(result.current[0].remaining).toBe(500);
    expect(result.current[0].percentage).toBe(50);
    expect(result.current[0].status).toBe("ok");
  });

  it("marks a budget as 'near' at 80%+ and 'over' at 100%+", () => {
    useBudgetStore.setState({
      budgets: [
        { id: 1, category: "Food", amount: 1000, period: "monthly" },
        { id: 2, category: "Transport", amount: 500, period: "monthly" },
      ],
    });

    useTransactionStore.setState({
      transactions: [
        { title: "Big lunch", amount: 850, type: "expense", category: "Food", account: "Cash", date: today, status: "completed" },
        { title: "Taxi", amount: 600, type: "expense", category: "Transport", account: "Cash", date: today, status: "completed" },
      ],
    });

    const { result } = renderHook(() => useBudgetProgress());
    const food = result.current.find((p) => p.budget.category === "Food")!;
    const transport = result.current.find((p) => p.budget.category === "Transport")!;

    expect(food.status).toBe("near");
    expect(transport.status).toBe("over");
    expect(transport.percentage).toBe(100); // clamped
  });

  it("excludes transactions outside the current period", () => {
    useBudgetStore.setState({ budgets: [{ id: 1, category: "Food", amount: 1000, period: "monthly" }] });
    useTransactionStore.setState({
      transactions: [
        { title: "Old lunch", amount: 500, type: "expense", category: "Food", account: "Cash", date: "2020-01-01", status: "completed" },
      ],
    });

    const { result } = renderHook(() => useBudgetProgress());
    expect(result.current[0].spent).toBe(0);
  });
});
