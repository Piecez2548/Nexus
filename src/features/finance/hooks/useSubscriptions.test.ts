import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSubscriptions } from "./useSubscriptions";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import type { Transaction } from "@/features/finance/types";

function seed(transactions: Transaction[]) {
  useTransactionStore.setState({ transactions });
}

describe("useSubscriptions", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [], loading: false });
  });

  it("returns nothing when there are no recurring transactions", () => {
    seed([
      { title: "Coffee", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-01", status: "completed" },
    ]);

    const { result } = renderHook(() => useSubscriptions());

    expect(result.current.subscriptions).toHaveLength(0);
    expect(result.current.totalMonthly).toBe(0);
  });

  it("ignores non-expense recurring transactions", () => {
    seed([
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01", status: "completed", recurring: { frequency: "monthly" } },
    ]);

    const { result } = renderHook(() => useSubscriptions());
    expect(result.current.subscriptions).toHaveLength(0);
  });

  it("collapses repeated instances of the same recurring title into one subscription", () => {
    seed([
      { title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash", date: "2026-05-01", status: "completed", recurring: { frequency: "monthly" } },
      { title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash", date: "2026-06-01", status: "completed", recurring: { frequency: "monthly" } },
      { title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash", date: "2026-07-01", status: "completed", recurring: { frequency: "monthly" } },
    ]);

    const { result } = renderHook(() => useSubscriptions());

    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.subscriptions[0].lastDate).toBe("2026-07-01");
  });

  it("computes a monthly-equivalent cost per frequency", () => {
    seed([
      { title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash", date: "2026-07-01", status: "completed", recurring: { frequency: "monthly" } },
      { title: "Domain", amount: 1200, type: "expense", category: "Utilities", account: "Cash", date: "2026-01-01", status: "completed", recurring: { frequency: "yearly" } },
    ]);

    const { result } = renderHook(() => useSubscriptions());

    const netflix = result.current.subscriptions.find((s) => s.title === "Netflix")!;
    const domain = result.current.subscriptions.find((s) => s.title === "Domain")!;

    expect(netflix.monthlyEquivalent).toBe(419);
    expect(domain.monthlyEquivalent).toBeCloseTo(100, 5);
    expect(result.current.totalMonthly).toBeCloseTo(519, 5);
  });

  it("sorts subscriptions by monthly-equivalent cost descending", () => {
    seed([
      { title: "Domain", amount: 1200, type: "expense", category: "Utilities", account: "Cash", date: "2026-01-01", status: "completed", recurring: { frequency: "yearly" } },
      { title: "Netflix", amount: 419, type: "expense", category: "Entertainment", account: "Cash", date: "2026-07-01", status: "completed", recurring: { frequency: "monthly" } },
    ]);

    const { result } = renderHook(() => useSubscriptions());

    expect(result.current.subscriptions[0].title).toBe("Netflix");
    expect(result.current.subscriptions[1].title).toBe("Domain");
  });
});
