import { describe, expect, it } from "vitest";
import { buildScoreContext, type ScoreContextInput } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/buildScoreContext";
import type { Transaction } from "@/features/finance/types";

function input(overrides: Partial<ScoreContextInput> = {}): ScoreContextInput {
  return { transactions: [], budgets: [], goals: [], recipientProfiles: [], goalMilestoneEvents: [], ...overrides };
}

describe("buildScoreContext", () => {
  it("carries `now` through unchanged", () => {
    const now = new Date(2026, 6, 30);
    expect(buildScoreContext(input(), now).now).toBe(now);
  });

  it("scopes cashFlowAnalysis and budgetAnalysis to the requested `now`, not the caller's wall-clock time", () => {
    const transactions: Transaction[] = [
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-01-10", status: "completed" },
      { title: "Food", amount: 1000, type: "expense", account: "Cash", date: "2026-01-15", status: "completed", category: "Food" },
      // Dated after the requested `now` below — must not be counted.
      { title: "Later purchase", amount: 5000, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", category: "Food" },
    ];

    const context = buildScoreContext(input({ transactions, budgets: [{ id: 1, category: "Food", amount: 2000, period: "monthly" }] }), new Date(2026, 0, 31));

    expect(context.cashFlowAnalysis.income).toBe(30000);
    expect(context.cashFlowAnalysis.expense).toBe(1000);
    expect(context.budgetAnalysis.entries).toHaveLength(1);
    expect(context.budgetAnalysis.entries[0].spent).toBe(1000);
  });

  it("passes goals through analyzeGoals, scoped to the requested `now`", () => {
    const now = new Date(2026, 6, 30);
    const context = buildScoreContext(input({ goals: [{ id: 1, name: "Emergency Fund", targetAmount: 10000, currentAmount: 5000 }] }), now);
    expect(context.goalProgress).toHaveLength(1);
    expect(context.goalProgress[0].progressPercent).toBe(50);
  });
});
