import { describe, expect, it } from "vitest";
import { analyzeHealthScore, computeMonthsOfHistory, gradeForScore } from "./healthScore";
import { computeBudgetSpend, type BudgetProgress } from "@/features/finance/utils/budgetStatus";
import { toLocalDateString } from "@/utils/localDate";
import type { Budget, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function budgetProgressFor(budgets: Budget[], transactions: Transaction[]): BudgetProgress[] {
  return budgets.map((budget) => ({ budget, ...computeBudgetSpend(budget, transactions, now) }));
}

function sixMonthsOfIncome(amounts: number[]): Transaction[] {
  // amounts[0] = 5 months ago .. amounts[5] = current month (July 2026).
  return amounts.map((amount, i) => ({
    title: "Salary",
    amount,
    type: "income" as const,
    category: "Salary",
    account: "Bank",
    date: toLocalDateString(new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)),
    status: "completed" as const,
  }));
}

describe("computeMonthsOfHistory", () => {
  it("returns 0 with no transactions", () => {
    expect(computeMonthsOfHistory([], now)).toBe(0);
  });

  it("returns 1 for a single-month-old profile", () => {
    expect(computeMonthsOfHistory([txn({ date: "2026-07-05" })], now)).toBe(1);
  });

  it("returns the month span between the earliest transaction and now, capped at 6", () => {
    expect(computeMonthsOfHistory([txn({ date: "2026-01-01" })], now)).toBe(6);
  });
});

describe("gradeForScore", () => {
  it("grades excellent at 85 and above, good just below it", () => {
    expect(gradeForScore(85)).toBe("excellent");
    expect(gradeForScore(84)).toBe("good");
  });

  it("grades good at 70 and above, fair just below it", () => {
    expect(gradeForScore(70)).toBe("good");
    expect(gradeForScore(69)).toBe("fair");
  });

  it("grades fair at 50 and above, poor just below it", () => {
    expect(gradeForScore(50)).toBe("fair");
    expect(gradeForScore(49)).toBe("poor");
  });
});

describe("analyzeHealthScore", () => {
  it("returns insufficientData when total history is under 2 months", () => {
    const result = analyzeHealthScore([txn({ date: "2026-07-05" })], [], now);
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBeNull();
    expect(result.grade).toBeNull();
  });

  it("returns a matching grade whenever the overall score is non-null", () => {
    const transactions = sixMonthsOfIncome([5000, 5000, 5000, 5000, 5000, 5000]);
    const result = analyzeHealthScore(transactions, [], now);
    expect(result.score).not.toBeNull();
    expect(result.grade).toBe(gradeForScore(result.score!));
  });

  it("returns null savingRate/expenseRatio sub-scores when there's zero income", () => {
    const transactions = [
      txn({ type: "expense", date: "2026-06-05" }),
      txn({ type: "expense", date: "2026-07-05" }),
    ];
    const result = analyzeHealthScore(transactions, [], now);
    const savingRate = result.subScores.find((s) => s.key === "savingRate");
    expect(savingRate?.score).toBeNull();
  });

  it("scores expenseRatio as 0 (not null) when there's expense but zero income this month", () => {
    const transactions = [
      { title: "Salary", amount: 1000, type: "income" as const, category: "Salary", account: "Bank", date: "2026-06-01", status: "completed" as const },
      txn({ type: "expense", amount: 200, date: "2026-07-05" }),
    ];
    const result = analyzeHealthScore(transactions, [], now);
    const expenseRatio = result.subScores.find((s) => s.key === "expenseRatio");
    expect(expenseRatio?.score).toBe(0);
  });

  it("scores a negative saving rate (spending more than earned) at 0, not negative", () => {
    const transactions = [
      { title: "Salary", amount: 1000, type: "income" as const, category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" as const },
      txn({ type: "expense", amount: 1500, date: "2026-07-05" }),
    ];
    const result = analyzeHealthScore(transactions, [], now);
    const savingRate = result.subScores.find((s) => s.key === "savingRate");
    expect(savingRate?.score).toBe(0);
    expect(savingRate?.value).toBeLessThan(0);
  });

  it("returns null budgetControl/budgetUsage when there are no budgets", () => {
    const transactions = [
      txn({ type: "income", amount: 1000, date: "2026-06-01" }),
      txn({ type: "income", amount: 1000, date: "2026-07-01" }),
    ];
    const result = analyzeHealthScore(transactions, [], now);
    expect(result.subScores.find((s) => s.key === "budgetControl")?.score).toBeNull();
    expect(result.subScores.find((s) => s.key === "budgetUsage")?.score).toBeNull();
  });

  it("scores budgetControl=0 and budgetUsage correctly low (not 100) when every budget is blown", () => {
    const budgets: Budget[] = [{ id: 1, category: "Food", amount: 500, period: "monthly" }];
    const transactions = [
      txn({ type: "income", amount: 1000, date: "2026-06-01" }),
      txn({ type: "income", amount: 1000, date: "2026-07-01" }),
      // 400% utilization — BudgetProgress.percentage would clamp this to
      // 100, which must NOT read as a perfect Budget Usage score.
      txn({ category: "Food", amount: 2000, date: "2026-07-10" }),
    ];
    const progress = budgetProgressFor(budgets, transactions);
    expect(progress[0].status).toBe("over");
    expect(progress[0].percentage).toBe(100); // sanity-check the clamp this test guards against

    const result = analyzeHealthScore(transactions, progress, now);
    expect(result.subScores.find((s) => s.key === "budgetControl")?.score).toBe(0);

    const budgetUsage = result.subScores.find((s) => s.key === "budgetUsage");
    expect(budgetUsage?.score).not.toBe(100);
    expect(budgetUsage?.score).toBeLessThan(50);
  });

  it("scores budgetUsage at exactly 100 for a budget spent to exactly 100%", () => {
    const budgets: Budget[] = [{ id: 1, category: "Food", amount: 500, period: "monthly" }];
    const transactions = [
      txn({ type: "income", amount: 1000, date: "2026-06-01" }),
      txn({ type: "income", amount: 1000, date: "2026-07-01" }),
      txn({ category: "Food", amount: 500, date: "2026-07-10" }),
    ];
    const progress = budgetProgressFor(budgets, transactions);
    const result = analyzeHealthScore(transactions, progress, now);
    expect(result.subScores.find((s) => s.key === "budgetUsage")?.score).toBe(100);
  });

  it("skips (does not zero) a budget with a non-positive amount when scoring budgetUsage", () => {
    const budgets: Budget[] = [
      { id: 1, category: "Food", amount: 0, period: "monthly" },
      { id: 2, category: "Transport", amount: 500, period: "monthly" },
    ];
    const transactions = [
      txn({ type: "income", amount: 1000, date: "2026-06-01" }),
      txn({ type: "income", amount: 1000, date: "2026-07-01" }),
      txn({ category: "Transport", amount: 500, date: "2026-07-10" }),
    ];
    const progress = budgetProgressFor(budgets, transactions);
    const result = analyzeHealthScore(transactions, progress, now);
    expect(result.subScores.find((s) => s.key === "budgetUsage")?.score).toBe(100);
  });

  it("returns null incomeStability with fewer than 2 months of history", () => {
    const transactions = [txn({ type: "income", amount: 1000, date: "2026-07-05" })];
    const result = analyzeHealthScore(transactions, [], new Date(2026, 6, 6));
    expect(result.subScores.find((s) => s.key === "incomeStability")?.score).toBeNull();
  });

  it("scores incomeStability at 100 for perfectly identical monthly income", () => {
    const transactions = sixMonthsOfIncome([5000, 5000, 5000, 5000, 5000, 5000]);
    const result = analyzeHealthScore(transactions, [], now);
    expect(result.subScores.find((s) => s.key === "incomeStability")?.score).toBeCloseTo(100, 5);
  });

  it("scores incomeStability lower for volatile monthly income", () => {
    const transactions = sixMonthsOfIncome([1000, 9000, 1000, 9000, 1000, 9000]);
    const result = analyzeHealthScore(transactions, [], now);
    const score = result.subScores.find((s) => s.key === "incomeStability")?.score;
    expect(score).not.toBeNull();
    expect(score!).toBeLessThan(50);
  });

  it("computes cashFlow as the ratio of non-negative-net-cash-flow months", () => {
    const transactions = [
      { title: "Salary", amount: 1000, type: "income" as const, category: "Salary", account: "Bank", date: "2026-06-01", status: "completed" as const },
      txn({ type: "expense", amount: 2000, date: "2026-06-10" }), // June: negative
      { title: "Salary", amount: 1000, type: "income" as const, category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" as const },
      txn({ type: "expense", amount: 500, date: "2026-07-10" }), // July: positive
    ];
    const result = analyzeHealthScore(transactions, [], now);
    const cashFlow = result.subScores.find((s) => s.key === "cashFlow");
    expect(cashFlow?.score).not.toBeNull();
    expect(cashFlow?.score).toBeGreaterThan(0);
    expect(cashFlow?.score).toBeLessThan(100);
  });

  it("averages only the non-null sub-scores into the overall score", () => {
    // No budgets at all -> budgetControl/budgetUsage excluded, not zeroed.
    const transactions = sixMonthsOfIncome([5000, 5000, 5000, 5000, 5000, 5000]);
    const result = analyzeHealthScore(transactions, [], now);
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);

    const included = result.subScores.filter((s) => s.score !== null);
    const expected = included.reduce((sum, s) => sum + s.score!, 0) / included.length;
    expect(result.score).toBeCloseTo(expected, 5);
  });
});
