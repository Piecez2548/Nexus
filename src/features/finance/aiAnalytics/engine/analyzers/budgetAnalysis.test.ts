import { describe, expect, it } from "vitest";
import { analyzeBudgets } from "./budgetAnalysis";
import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { Budget, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21);

function progress(budget: Budget, transactions: Transaction[]): BudgetProgress {
  return { budget, ...computeBudgetSpend(budget, transactions, now) };
}

function txn(amount: number, category: string, date = "2026-07-10"): Transaction {
  return { title: "Item", amount, type: "expense", category, account: "Cash", date, status: "completed" };
}

describe("analyzeBudgets", () => {
  it("returns zeroed counts with no budgets", () => {
    const result = analyzeBudgets([]);
    expect(result).toEqual({ entries: [], overCount: 0, nearCount: 0, okCount: 0 });
  });

  it("counts ok/near/over budgets correctly", () => {
    const budgets: Budget[] = [
      { id: 1, category: "Food", amount: 1000, period: "monthly" },
      { id: 2, category: "Transport", amount: 1000, period: "monthly" },
      { id: 3, category: "Shopping", amount: 1000, period: "monthly" },
    ];
    const transactions = [txn(100, "Food"), txn(850, "Transport"), txn(1200, "Shopping")];
    const entries = budgets.map((b) => progress(b, transactions));

    const result = analyzeBudgets(entries);
    expect(result.okCount).toBe(1);
    expect(result.nearCount).toBe(1);
    expect(result.overCount).toBe(1);
  });

  it("suggests a monthly cap and potential savings only for over-budget entries", () => {
    const okBudget: Budget = { id: 1, category: "Food", amount: 1000, period: "monthly" };
    const overBudget: Budget = { id: 2, category: "Shopping", amount: 1000, period: "monthly" };
    const transactions = [txn(500, "Food"), txn(1400, "Shopping")];
    const entries = [progress(okBudget, transactions), progress(overBudget, transactions)];

    const result = analyzeBudgets(entries);
    const ok = result.entries.find((e) => e.budget.category === "Food")!;
    const over = result.entries.find((e) => e.budget.category === "Shopping")!;

    expect(ok.suggestedMonthlyCap).toBeNull();
    expect(ok.potentialMonthlySavings).toBeNull();

    expect(over.suggestedMonthlyCap).toBe(1000);
    expect(over.potentialMonthlySavings).toBe(400);
  });
});
