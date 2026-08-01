import { describe, expect, it } from "vitest";
import { analyzeCategoryDetail } from "./categoryDetail";
import type { Budget, RecipientProfile, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function profile(overrides: Partial<RecipientProfile> = {}): RecipientProfile {
  return {
    recipientKey: "081-0000000",
    alias: "Somchai",
    category: "Food",
    transactionCount: 1,
    totalAmount: 100,
    lastUsedDate: "2026-07-15",
    confidenceScore: 1,
    ...overrides,
  };
}

function budget(overrides: Partial<Budget> = {}): Budget {
  return { id: 1, category: "Food", amount: 1000, period: "monthly", ...overrides };
}

describe("analyzeCategoryDetail", () => {
  it("returns zeroed fields with no transactions in the category", () => {
    const result = analyzeCategoryDetail([], [], [], "Food", now);
    expect(result.totalSpent).toBe(0);
    expect(result.transactionCount).toBe(0);
    expect(result.averagePerPurchase).toBe(0);
    expect(result.averagePerDay).toBe(0);
    expect(result.transactions).toEqual([]);
    expect(result.topMerchant).toBeNull();
    expect(result.monthlyTrend).toHaveLength(6);
    expect(result.monthlyTrend.every((m) => m.amount === 0)).toBe(true);
  });

  it("returns no recommendation when there's no budget and no spend in the category", () => {
    const result = analyzeCategoryDetail([], [], [], "Food", now);
    expect(result.budget).toBeNull();
    expect(result.recommendation).toBeNull();
    expect(result.potentialSavings).toBeNull();
  });

  it("computes totalSpent, transactionCount, and averagePerPurchase from matching expense transactions", () => {
    const transactions = [
      txn({ amount: 300, date: "2026-07-10" }),
      txn({ amount: 100, date: "2026-07-15" }),
    ];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);
    expect(result.totalSpent).toBe(400);
    expect(result.transactionCount).toBe(2);
    expect(result.averagePerPurchase).toBe(200);
  });

  it("excludes transactions from other categories, other types, and outside the 6-month window", () => {
    const transactions = [
      txn({ amount: 300, category: "Food", date: "2026-07-10" }),
      txn({ amount: 500, category: "Shopping", date: "2026-07-10" }), // wrong category
      txn({ amount: 500, category: "Food", type: "income", date: "2026-07-10" }), // wrong type
      txn({ amount: 500, category: "Food", date: "2025-01-01" }), // outside the trailing 6-month window
    ];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);
    expect(result.totalSpent).toBe(300);
    expect(result.transactionCount).toBe(1);
  });

  it("computes averagePerDay as totalSpent divided by days since the window start", () => {
    const transactions = [txn({ amount: 600, date: "2026-07-10" })];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);

    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const expectedDays = Math.round((now.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000));
    expect(result.averagePerDay).toBeCloseTo(600 / expectedDays);
  });

  it("buckets monthlyTrend across all 6 months, including months with zero spend", () => {
    const transactions = [txn({ amount: 200, date: "2026-07-05" }), txn({ amount: 150, date: "2026-06-05" })];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);
    expect(result.monthlyTrend).toHaveLength(6);
    expect(result.monthlyTrend.find((m) => m.monthKey === "2026-07")?.amount).toBe(200);
    expect(result.monthlyTrend.find((m) => m.monthKey === "2026-06")?.amount).toBe(150);
    expect(result.monthlyTrend.find((m) => m.monthKey === "2026-05")?.amount).toBe(0);
  });

  it("returns the recipient with the highest in-category total as topMerchant, resolving their alias", () => {
    const profiles = [profile({ recipientKey: "a", alias: "Small Cafe" }), profile({ recipientKey: "b", alias: "Big Restaurant" })];
    const transactions = [
      txn({ recipient: "a", amount: 50, date: "2026-07-05" }),
      txn({ recipient: "b", amount: 300, date: "2026-07-06" }),
      txn({ recipient: "b", amount: 100, date: "2026-07-07" }),
    ];
    const result = analyzeCategoryDetail(transactions, profiles, [], "Food", now);
    expect(result.topMerchant).toEqual({ alias: "Big Restaurant", transactionCount: 2, totalAmount: 400 });
  });

  it("returns transactions most-recent-first", () => {
    const transactions = [txn({ id: 1, date: "2026-07-01" }), txn({ id: 2, date: "2026-07-15" }), txn({ id: 3, date: "2026-07-08" })];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);
    expect(result.transactions.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("returns a categoryHasBudget recommendation with the overage as potentialSavings when over budget", () => {
    const transactions = [txn({ amount: 1200, date: "2026-07-05" })];
    const budgets = [budget({ amount: 1000 })];
    const result = analyzeCategoryDetail(transactions, [], budgets, "Food", now);
    expect(result.budget).toEqual(budgets[0]);
    expect(result.recommendation).toMatchObject({ key: "categoryHasBudget" });
    expect(result.potentialSavings).toBe(200);
  });

  it("returns a categoryHasBudget recommendation with null potentialSavings when within budget", () => {
    const transactions = [txn({ amount: 300, date: "2026-07-05" })];
    const budgets = [budget({ amount: 1000 })];
    const result = analyzeCategoryDetail(transactions, [], budgets, "Food", now);
    expect(result.recommendation).toMatchObject({ key: "categoryHasBudget" });
    expect(result.potentialSavings).toBeNull();
  });

  it("returns a categoryNoBudgetSuggestion recommendation with a heuristic potentialSavings when there's no budget", () => {
    const transactions = [
      txn({ amount: 600, date: "2026-07-05" }),
      txn({ amount: 600, date: "2026-06-05" }),
      txn({ amount: 600, date: "2026-05-05" }),
      txn({ amount: 600, date: "2026-04-05" }),
      txn({ amount: 600, date: "2026-03-05" }),
      txn({ amount: 600, date: "2026-02-05" }),
    ];
    const result = analyzeCategoryDetail(transactions, [], [], "Food", now);
    // Average monthly spend over the 6-month window = 3600 / 6 = 600.
    expect(result.recommendation).toMatchObject({ key: "categoryNoBudgetSuggestion", params: { suggestedCap: 420 } });
    expect(result.potentialSavings).toBe(180); // 30% of 600
  });
});
