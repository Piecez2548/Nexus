import { describe, expect, it } from "vitest";
import { computeBudgetSpend } from "./budgetStatus";
import type { Budget, Transaction } from "@/features/finance/types";

const today = "2026-07-15";

function budget(overrides: Partial<Budget> = {}): Budget {
  return { id: 1, category: "Food", amount: 1000, period: "monthly", ...overrides };
}

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Lunch", amount: 300, type: "expense", category: "Food", account: "Cash", date: today, status: "completed", ...overrides };
}

const now = new Date(2026, 6, 15);

describe("computeBudgetSpend", () => {
  it("sums matching-category expense transactions within the current period", () => {
    const result = computeBudgetSpend(budget(), [txn({ amount: 300 }), txn({ amount: 200 }), txn({ category: "Transport", amount: 50 })], now);
    expect(result.spent).toBe(500);
    expect(result.remaining).toBe(500);
    expect(result.percentage).toBe(50);
    expect(result.status).toBe("ok");
  });

  it("marks 'near' at 80%+ and 'over' at 100%+, clamping percentage for display", () => {
    const near = computeBudgetSpend(budget({ amount: 1000 }), [txn({ amount: 850 })], now);
    expect(near.status).toBe("near");

    const over = computeBudgetSpend(budget({ amount: 500 }), [txn({ amount: 600 })], now);
    expect(over.status).toBe("over");
    expect(over.percentage).toBe(100); // clamped, even though 600/500 = 120%
  });

  it("excludes transactions outside the current period", () => {
    const result = computeBudgetSpend(budget(), [txn({ date: "2020-01-01" })], now);
    expect(result.spent).toBe(0);
  });

  it("returns 0% for a zero-amount budget instead of dividing by zero", () => {
    const result = computeBudgetSpend(budget({ amount: 0 }), [txn()], now);
    expect(result.percentage).toBe(0);
    expect(Number.isNaN(result.percentage)).toBe(false);
  });

  it("respects an explicit now override", () => {
    const result = computeBudgetSpend(budget(), [txn({ date: "2026-01-10" })], new Date(2026, 0, 15));
    expect(result.spent).toBe(300);
  });
});
