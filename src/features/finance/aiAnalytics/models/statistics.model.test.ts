import { describe, expect, it } from "vitest";
import { buildStatistics } from "@/features/finance/aiAnalytics/models/statistics.model";
import type { RecipientProfile, Transaction } from "@/features/finance/types";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

function stats(overrides: Partial<TransactionStatistics> = {}): TransactionStatistics {
  return {
    averageDailySpending: 0,
    averageWeeklySpending: 0,
    averageMonthlySpending: 0,
    averageTransaction: 0,
    largestTransaction: null,
    smallestTransaction: null,
    ...overrides,
  };
}

function tx(type: Transaction["type"], amount: number, category?: string): Transaction {
  return { title: "Test", amount, type, account: "Cash", date: "2026-07-01", category };
}

function profile(recipientKey: string): RecipientProfile {
  return { recipientKey, alias: recipientKey, category: "Food", transactionCount: 1, totalAmount: 100, lastUsedDate: "2026-07-01", confidenceScore: 1 };
}

describe("buildStatistics", () => {
  it("is all-zero on a brand-new profile", () => {
    const result = buildStatistics(stats(), [], []);
    expect(result).toMatchObject({ totalIncome: 0, totalExpense: 0, totalTransactions: 0, categoryCount: 0, merchantCount: 0 });
  });

  it("sums income and expense across every transaction, not just this month", () => {
    const transactions = [tx("income", 30000, "Salary"), tx("expense", 500, "Food"), tx("expense", 300, "Food")];
    const result = buildStatistics(stats(), transactions, []);
    expect(result.totalIncome).toBe(30000);
    expect(result.totalExpense).toBe(800);
    expect(result.totalTransactions).toBe(3);
  });

  it("counts distinct categories, ignoring transactions with no category", () => {
    const transactions = [tx("expense", 100, "Food"), tx("expense", 100, "Food"), tx("expense", 100, "Transport"), tx("expense", 100, undefined)];
    expect(buildStatistics(stats(), transactions, []).categoryCount).toBe(2);
  });

  it("counts merchants as the number of recipient profiles", () => {
    expect(buildStatistics(stats(), [], [profile("a"), profile("b")]).merchantCount).toBe(2);
  });

  it("passes through the pre-computed averages and extremes verbatim", () => {
    const largest = { id: 1, title: "Big", amount: 999, category: "Shopping", date: "2026-07-15" };
    const result = buildStatistics(stats({ averageTransaction: 250, largestTransaction: largest }), [], []);
    expect(result.averageTransaction).toBe(250);
    expect(result.largestExpense).toEqual(largest);
  });
});
