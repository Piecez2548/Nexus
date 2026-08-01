import { describe, expect, it } from "vitest";
import { generateForecast } from "./forecast";
import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";
import type { Budget, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21 — 21 of 31 days elapsed

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function progress(budget: Budget, transactions: Transaction[]): BudgetProgress {
  return { budget, ...computeBudgetSpend(budget, transactions, now) };
}

describe("generateForecast", () => {
  it("returns zeroed figures with no transactions", () => {
    const result = generateForecast([], [], now);
    expect(result.expectedSavings).toBe(0);
    expect(result.expectedEndOfMonthBalance).toBe(0);
    expect(result.budgetOverflowRisk).toEqual([]);
  });

  it("linearly projects income/expense for the rest of the month", () => {
    // 21000 income and 6300 expense over the first 21 days -> daily rate
    // 1000/day income, 300/day expense, projected over 31 days.
    const transactions = [
      txn({ type: "income", amount: 21000, date: "2026-07-01" }),
      txn({ type: "expense", amount: 6300, date: "2026-07-05" }),
    ];
    const result = generateForecast(transactions, [], now);
    expect(result.expectedSavings).toBeCloseTo(1000 * 31 - 300 * 31, 5);
  });

  it("adds the projected saving on top of the previous month's cumulative balance", () => {
    const transactions = [
      txn({ type: "income", amount: 5000, date: "2026-06-01" }),
      txn({ type: "income", amount: 3100, date: "2026-07-01" }),
    ];
    const result = generateForecast(transactions, [], now);
    // Previous month's balance (5000) plus this month's 3100-so-far
    // linearly projected across all 31 days from the 21 elapsed so far.
    const projectedIncome = (3100 / 21) * 31;
    expect(result.expectedEndOfMonthBalance).toBeCloseTo(5000 + projectedIncome, 5);
  });

  it("flags a monthly budget on pace to bust even while currently 'ok'", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 500, period: "monthly" };
    // 350 spent in 21 days -> projected 350/21*31 ≈ 516.7, over the 500 cap.
    const transactions = [txn({ amount: 350, category: "Food", date: "2026-07-10" })];
    const budgetProgress = [progress(budget, transactions)];
    expect(budgetProgress[0].status).toBe("ok");

    const result = generateForecast(transactions, budgetProgress, now);
    expect(result.budgetOverflowRisk).toHaveLength(1);
    expect(result.budgetOverflowRisk[0].category).toBe("Food");
    expect(result.budgetOverflowRisk[0].projectedPercentage).toBeGreaterThan(100);
  });

  it("does not flag a budget already over (already reported by budgetAnalysis)", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 100, period: "monthly" };
    const transactions = [txn({ amount: 500, category: "Food", date: "2026-07-10" })];
    const budgetProgress = [progress(budget, transactions)];
    expect(budgetProgress[0].status).toBe("over");

    const result = generateForecast(transactions, budgetProgress, now);
    expect(result.budgetOverflowRisk).toEqual([]);
  });

  it("skips non-monthly budgets for overflow risk", () => {
    const budget: Budget = { id: 1, category: "Food", amount: 100, period: "weekly" };
    const transactions = [txn({ amount: 90, category: "Food", date: "2026-07-20" })];
    const budgetProgress = [progress(budget, transactions)];

    const result = generateForecast(transactions, budgetProgress, now);
    expect(result.budgetOverflowRisk).toEqual([]);
  });

  it("reports futureCashFlowTrend as insufficientData with under 2 months of history", () => {
    const result = generateForecast([txn({ date: "2026-07-05" })], [], now);
    expect(result.futureCashFlowTrend.basis).toBe("insufficientData");
    expect(result.futureCashFlowTrend.projectedMonthlyNet).toBeNull();
  });

  it("projects a flat trailing average once there's at least 2 months of history", () => {
    const transactions = [
      txn({ type: "income", amount: 1000, date: "2026-06-01" }),
      txn({ type: "expense", amount: 200, date: "2026-06-05" }),
      txn({ type: "income", amount: 1000, date: "2026-07-01" }),
      txn({ type: "expense", amount: 400, date: "2026-07-05" }),
    ];
    const result = generateForecast(transactions, [], now);
    expect(result.futureCashFlowTrend.basis).toBe("linearProjection");
    // June net = 800, July net = 600 -> average 700
    expect(result.futureCashFlowTrend.projectedMonthlyNet).toBeCloseTo(700, 5);
  });
});
