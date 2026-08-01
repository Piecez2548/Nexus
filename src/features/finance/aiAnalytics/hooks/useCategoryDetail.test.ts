import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCategoryDetail } from "./useCategoryDetail";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function resetStores() {
  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useRecipientProfileStore.setState({ profiles: [], loading: false, error: null });
}

describe("useCategoryDetail", () => {
  beforeEach(() => {
    resetStores();
  });

  it("returns null when no category is selected", () => {
    const { result } = renderHook(() => useCategoryDetail(null, now));
    expect(result.current).toBeNull();
  });

  it("computes real category detail from the stores once a category is selected", () => {
    useTransactionStore.setState({ transactions: [txn({ amount: 300 }), txn({ amount: 100, category: "Shopping" })], loading: false });

    const { result } = renderHook(() => useCategoryDetail("Food", now));
    expect(result.current).not.toBeNull();
    expect(result.current?.category).toBe("Food");
    expect(result.current?.totalSpent).toBe(300);
    expect(result.current?.transactionCount).toBe(1);
  });

  it("recomputes when the selected category changes", () => {
    useTransactionStore.setState({
      transactions: [txn({ amount: 300, category: "Food" }), txn({ amount: 500, category: "Shopping" })],
      loading: false,
    });

    const { result, rerender } = renderHook(({ category }) => useCategoryDetail(category, now), { initialProps: { category: "Food" as string | null } });
    expect(result.current?.totalSpent).toBe(300);

    rerender({ category: "Shopping" });
    expect(result.current?.category).toBe("Shopping");
    expect(result.current?.totalSpent).toBe(500);

    rerender({ category: null });
    expect(result.current).toBeNull();
  });

  it("picks up a budget for the selected category from the budget store", () => {
    useTransactionStore.setState({ transactions: [txn({ amount: 1200 })], loading: false });
    useBudgetStore.setState({ budgets: [{ id: 1, category: "Food", amount: 1000, period: "monthly" }], loading: false, error: null });

    const { result } = renderHook(() => useCategoryDetail("Food", now));
    expect(result.current?.budget).toMatchObject({ category: "Food", amount: 1000 });
    expect(result.current?.recommendation).toMatchObject({ key: "categoryHasBudget" });
  });
});
