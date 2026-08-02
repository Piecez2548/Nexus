import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWhatIfScenario } from "./useWhatIfScenario";
import { runAnalysis } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import type { Transaction, Goal } from "@/features/finance/types";
import type { FinancialAnalysisInput } from "@/features/finance/aiAnalytics/types";

const now = new Date(2026, 6, 21); // 2026-07-21

const goal: Goal = { syncId: "goal-1", name: "Vacation", targetAmount: 20000, currentAmount: 5000 };

const transactions: Transaction[] = [
  { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-06-01", status: "completed" },
  { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
  { title: "Groceries", amount: 3000, type: "expense", category: "Food", account: "Cash", date: "2026-06-10", status: "completed" },
  { title: "Dinner out", amount: 1500, type: "expense", category: "Food", account: "Cash", date: "2026-07-10", status: "completed" },
  { title: "Latte", amount: 120, type: "expense", category: "Coffee", account: "Cash", date: "2026-06-15", status: "completed" },
  { title: "Latte", amount: 120, type: "expense", category: "Coffee", account: "Cash", date: "2026-07-15", status: "completed" },
  // A regular ~30-day recurring charge — detected as a subscription by computeSubscriptions.
  { title: "Netflix", amount: 299, type: "expense", category: "Entertainment", account: "Bank", date: "2026-05-01", status: "completed" },
  { title: "Netflix", amount: 299, type: "expense", category: "Entertainment", account: "Bank", date: "2026-06-01", status: "completed" },
  { title: "Netflix", amount: 299, type: "expense", category: "Entertainment", account: "Bank", date: "2026-07-01", status: "completed" },
];

function resetStores() {
  useTransactionStore.setState({ transactions, loading: false });
  useBudgetStore.setState({ budgets: [], loading: false, error: null });
  useGoalStore.setState({ goals: [goal], loading: false, error: null });
  useRecipientProfileStore.setState({ profiles: [], loading: false, error: null });
  useGoalMilestoneEventStore.setState({ events: [], loading: false, error: null });
}

// The real, fully-computed FinancialAnalysisResult — goalProgress/
// spendingAnalysis/subscriptions are analyzer outputs the hook needs as
// explicit arguments (see useWhatIfScenario.ts's own header comment), so
// tests source them from a real run, not hand-typed mocks.
function analysis() {
  const input: FinancialAnalysisInput = {
    transactions,
    budgets: [],
    categories: [],
    goals: [goal],
    recipientProfiles: [],
    goalMilestoneEvents: [],
    now,
  };
  return runAnalysis(input);
}

describe("useWhatIfScenario", () => {
  beforeEach(() => {
    resetStores();
  });

  it("returns null when input is null", () => {
    const result = analysis();
    const { result: hookResult } = renderHook(() =>
      useWhatIfScenario(null, result.goalProgress, result.spendingAnalysis, result.behaviorAnalysis.subscriptions, now)
    );
    expect(hookResult.current).toBeNull();
  });

  it("simulates reduceFoodSpending", () => {
    const result = analysis();
    const { result: hookResult } = renderHook(() =>
      useWhatIfScenario({ type: "reduceFoodSpending", reductionPercent: 20 }, result.goalProgress, result.spendingAnalysis, result.behaviorAnalysis.subscriptions, now)
    );
    expect(hookResult.current?.type).toBe("reduceFoodSpending");
    if (hookResult.current?.type === "reduceFoodSpending") {
      expect(hookResult.current.estimatedMonthlySavings).toBeGreaterThan(0);
      expect(hookResult.current.estimatedYearlySavings).toBeGreaterThan(0);
    }
  });

  it("simulates increaseGoalSavings", () => {
    const result = analysis();
    const { result: hookResult } = renderHook(() =>
      useWhatIfScenario(
        { type: "increaseGoalSavings", goalSyncId: "goal-1", additionalMonthlyAmount: 1000 },
        result.goalProgress,
        result.spendingAnalysis,
        result.behaviorAnalysis.subscriptions,
        now
      )
    );
    expect(hookResult.current?.type).toBe("increaseGoalSavings");
  });

  it("simulates cancelSubscriptions using a real detected subscription", () => {
    const result = analysis();
    expect(result.behaviorAnalysis.subscriptions.length).toBeGreaterThan(0);
    const normalizedTitles = result.behaviorAnalysis.subscriptions.map((s) => s.normalizedTitle);

    const { result: hookResult } = renderHook(() =>
      useWhatIfScenario({ type: "cancelSubscriptions", normalizedTitles }, result.goalProgress, result.spendingAnalysis, result.behaviorAnalysis.subscriptions, now)
    );
    expect(hookResult.current?.type).toBe("cancelSubscriptions");
    if (hookResult.current?.type === "cancelSubscriptions") {
      expect(hookResult.current.estimatedMonthlySavings).toBeGreaterThan(0);
    }
  });

  it("simulates reduceCoffeeSpending", () => {
    const result = analysis();
    const { result: hookResult } = renderHook(() =>
      useWhatIfScenario({ type: "reduceCoffeeSpending", reductionPercent: 50 }, result.goalProgress, result.spendingAnalysis, result.behaviorAnalysis.subscriptions, now)
    );
    expect(hookResult.current?.type).toBe("reduceCoffeeSpending");
  });

  it("recomputes when the trigger input changes", () => {
    const result = analysis();
    const { result: hookResult, rerender } = renderHook(
      ({ percent }) => useWhatIfScenario({ type: "reduceFoodSpending", reductionPercent: percent }, result.goalProgress, result.spendingAnalysis, result.behaviorAnalysis.subscriptions, now),
      { initialProps: { percent: 10 } }
    );
    const first = hookResult.current?.type === "reduceFoodSpending" ? hookResult.current.estimatedMonthlySavings : null;

    rerender({ percent: 50 });
    const second = hookResult.current?.type === "reduceFoodSpending" ? hookResult.current.estimatedMonthlySavings : null;

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).toBeGreaterThan(first!);
  });
});
