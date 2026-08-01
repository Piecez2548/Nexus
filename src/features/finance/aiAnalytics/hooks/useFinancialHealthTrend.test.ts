import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFinancialHealthTrend } from "./useFinancialHealthTrend";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);

function resetStores() {
  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useGoalStore.setState({ goals: [], loading: false, error: null });
  useRecipientProfileStore.setState({ profiles: [], loading: false, error: null });
  useGoalMilestoneEventStore.setState({ events: [], loading: false, error: null });
}

describe("useFinancialHealthTrend", () => {
  beforeEach(() => {
    resetStores();
  });

  it("returns 6 trend points with no data at all", () => {
    const { result } = renderHook(() => useFinancialHealthTrend(now));
    expect(result.current).toHaveLength(6);
    expect(result.current.every((p) => p.overallScore === null)).toBe(true);
  });

  it("reflects real transaction history from the stores", () => {
    const transactions: Transaction[] = [
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01" },
      { title: "Food", amount: 1000, type: "expense", account: "Cash", date: "2026-07-10" },
    ];
    useTransactionStore.setState({ transactions, loading: false });

    const { result } = renderHook(() => useFinancialHealthTrend(now));
    const nowPoint = result.current.find((p) => p.label === "now");
    expect(nowPoint?.overallScore).not.toBeNull();
  });
});
