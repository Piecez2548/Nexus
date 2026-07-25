import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useNotifications } from "./useNotifications";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useNotificationStore } from "@/store/notificationStore";
import type { Transaction, Budget } from "@/features/finance/types";

const today = new Date().toISOString().slice(0, 10);

describe("useNotifications", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
    useBudgetStore.setState({ budgets: [] });
    useNotificationStore.setState({ dismissedIds: [] });
  });

  it("returns no notifications when nothing is over budget or unusual", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toEqual([]);
  });

  it("includes a warning when a budget is over its limit", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 1000, period: "monthly" };
    useBudgetStore.setState({ budgets: [budget] });

    const transactions: Transaction[] = [
      { title: "Big lunch", amount: 1200, type: "expense", category: "Food", account: "Cash", date: today, status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    const { result } = renderHook(() => useNotifications());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("budget-1");
    expect(result.current[0].severity).toBe("warning");
    expect(result.current[0].message).toContain("เกินแล้ว");
  });

  it("includes a warning when a budget is near its limit but not over", () => {
    const budget: Budget = { id: 2, category: "Transport", amount: 1000, period: "monthly" };
    useBudgetStore.setState({ budgets: [budget] });

    const transactions: Transaction[] = [
      { title: "Taxi", amount: 850, type: "expense", category: "Transport", account: "Cash", date: today, status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    const { result } = renderHook(() => useNotifications());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].message).toContain("ใกล้เต็มแล้ว");
  });

  it("hides a notification once its id has been dismissed", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 1000, period: "monthly" };
    useBudgetStore.setState({ budgets: [budget] });

    const transactions: Transaction[] = [
      { title: "Big lunch", amount: 1200, type: "expense", category: "Food", account: "Cash", date: today, status: "completed" },
    ];
    useTransactionStore.setState({ transactions });

    useNotificationStore.setState({ dismissedIds: ["budget-1"] });

    const { result } = renderHook(() => useNotifications());
    expect(result.current).toEqual([]);
  });
});
