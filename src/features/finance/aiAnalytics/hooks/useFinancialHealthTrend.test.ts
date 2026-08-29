import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFinancialHealthTrend } from "./useFinancialHealthTrend";
import { useFinancialAnalysis } from "./useFinancialAnalysis";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);

function resetStores() {
  useTransactionStore.setState({ transactions: [], loading: false, error: null });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useCategoryStore.setState({ categories: [], loading: false, error: null });
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

  it("does not rerender or recompute when unrelated store state changes", () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useFinancialHealthTrend(now);
    });
    const initialResult = result.current;

    act(() => useTransactionStore.setState({ loading: true }));

    expect(renderCount).toBe(1);
    expect(result.current).toBe(initialResult);
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

  it("agrees exactly with useFinancialAnalysis's own financialHealthScore when given the same `now` (PERF-003)", async () => {
    const transactions: Transaction[] = [
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-06-01" },
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01" },
      { title: "Food", amount: 1000, type: "expense", account: "Cash", date: "2026-07-10" },
    ];
    useTransactionStore.setState({ transactions, loading: false });

    const { result: trend } = renderHook(() => useFinancialHealthTrend(now));
    const { result: analysis } = renderHook(() => useFinancialAnalysis(undefined, now));

    await waitFor(() => expect(analysis.current.data).not.toBeNull());

    const nowPoint = trend.current.find((p) => p.label === "now");
    expect(nowPoint?.overallScore).toBe(analysis.current.data!.financialHealthScore.overallScore);
    expect(nowPoint?.grade).toBe(analysis.current.data!.financialHealthScore.grade);
  });
});
