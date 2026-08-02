import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useGlobalSearch } from "./useGlobalSearch";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import type { Transaction } from "@/features/finance/types";
import type { Trade } from "@/features/trading/types";

describe("useGlobalSearch", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
    useTradeStore.setState({ trades: [] });
    useTodoStore.setState({ todos: [] });
    useHabitStore.setState({ habits: [] });
    useGoalStore.setState({ goals: [] });
    useHoldingStore.setState({ holdings: [] });
    useScheduleItemStore.setState({ items: [] });
    useBudgetStore.setState({ budgets: [] });
    useAccountStore.setState({ accounts: [] });
    useCategoryStore.setState({ categories: [] });
    useRecipientProfileStore.setState({ profiles: [] });
  });

  it("returns nothing for an empty query", () => {
    const { result } = renderHook(() => useGlobalSearch(""));
    expect(result.current).toEqual([]);
  });

  it("matches transactions by title, case-insensitively", () => {
    const transactions: Transaction[] = [
      { id: 1, title: "Starbucks Coffee", amount: 120, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { id: 2, title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01", status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    const { result } = renderHook(() => useGlobalSearch("starbucks"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Starbucks Coffee", path: "/transactions" });
  });

  it("matches trades by symbol or strategy", () => {
    const trades: Trade[] = [
      { id: 1, symbol: "AAPL", market: "stocks", direction: "long", status: "open", entryPrice: 100, quantity: 10, entryDate: "2026-07-20", strategy: "Breakout" },
      { id: 2, symbol: "MSFT", market: "stocks", direction: "long", status: "open", entryPrice: 300, quantity: 5, entryDate: "2026-07-21" },
    ];
    useTradeStore.setState({ trades });

    expect(renderHook(() => useGlobalSearch("aapl")).result.current).toHaveLength(1);
    expect(renderHook(() => useGlobalSearch("breakout")).result.current).toHaveLength(1);
    expect(renderHook(() => useGlobalSearch("msft")).result.current[0]).toMatchObject({
      label: "MSFT",
      path: "/trading/journal",
    });
  });

  it("combines results from both transactions and trades", () => {
    useTransactionStore.setState({
      transactions: [
        { id: 1, title: "AAPL dividend", amount: 50, type: "income", account: "Bank", date: "2026-07-20", status: "completed" },
      ],
    });
    useTradeStore.setState({
      trades: [
        { id: 1, symbol: "AAPL", market: "stocks", direction: "long", status: "open", entryPrice: 100, quantity: 10, entryDate: "2026-07-20" },
      ],
    });

    const { result } = renderHook(() => useGlobalSearch("aapl"));
    expect(result.current).toHaveLength(2);
  });

  it("matches a todo by title", () => {
    useTodoStore.setState({
      todos: [{ id: 1, title: "Renew passport", priority: "medium", completed: false, createdAt: "2026-07-01" }],
    });

    const { result } = renderHook(() => useGlobalSearch("passport"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Renew passport", path: "/todo" });
  });

  it("matches a habit by name", () => {
    useHabitStore.setState({
      habits: [{ id: 1, name: "Morning run", frequency: "daily", completedDates: [], createdAt: "2026-07-01" }],
    });

    const { result } = renderHook(() => useGlobalSearch("morning"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Morning run", path: "/habits" });
  });

  it("matches a goal by name", () => {
    useGoalStore.setState({
      goals: [{ id: 1, name: "Emergency Fund", targetAmount: 50000, currentAmount: 8000 }],
    });

    const { result } = renderHook(() => useGlobalSearch("emergency"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Emergency Fund", path: "/goals" });
  });

  it("matches a holding by symbol", () => {
    useHoldingStore.setState({
      holdings: [{ id: 1, symbol: "VOO", market: "etf", quantity: 3, avgCostPrice: 400, createdAt: "2026-07-01" }],
    });

    const { result } = renderHook(() => useGlobalSearch("voo"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "VOO", path: "/trading/portfolio" });
  });

  it("matches a schedule item by title", () => {
    useScheduleItemStore.setState({
      items: [
        {
          id: 1,
          title: "Gym session",
          icon: "dumbbell",
          color: "#000000",
          startTime: "07:00",
          repeat: { frequency: "daily" },
          enabled: true,
          createdAt: "2026-07-01",
        },
      ],
    });

    const { result } = renderHook(() => useGlobalSearch("gym"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Gym session", path: "/schedule" });
  });

  it("matches a budget by category", () => {
    useBudgetStore.setState({
      budgets: [{ id: 1, category: "Food", amount: 1000, period: "monthly" }],
    });

    const { result } = renderHook(() => useGlobalSearch("food"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Food", path: "/budget" });
  });

  it("matches an account by name", () => {
    useAccountStore.setState({
      accounts: [{ id: 1, name: "Main Bank", type: "bank", icon: "landmark", color: "#000000" }],
    });

    const { result } = renderHook(() => useGlobalSearch("main bank"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Main Bank", path: "/accounts" });
  });

  it("matches a category by name", () => {
    useCategoryStore.setState({
      categories: [{ id: 1, name: "Groceries", type: "expense", icon: "shopping-cart", color: "#000000" }],
    });

    const { result } = renderHook(() => useGlobalSearch("groceries"));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ label: "Groceries", path: "/categories" });
  });

  it("matches a recipient profile by alias or recipient key", () => {
    useRecipientProfileStore.setState({
      profiles: [
        {
          id: 1,
          recipientKey: "0812345678",
          alias: "Somchai Restaurant",
          category: "Food",
          transactionCount: 3,
          totalAmount: 900,
          lastUsedDate: "2026-07-10",
          confidenceScore: 1,
        },
      ],
    });

    expect(renderHook(() => useGlobalSearch("somchai")).result.current).toHaveLength(1);
    expect(renderHook(() => useGlobalSearch("0812345678")).result.current[0]).toMatchObject({
      label: "Somchai Restaurant",
      path: "/recipients",
    });
  });
});
