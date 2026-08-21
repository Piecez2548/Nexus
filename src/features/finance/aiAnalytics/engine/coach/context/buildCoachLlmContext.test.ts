import { describe, expect, it } from "vitest";
import { buildCoachLlmContext } from "./buildCoachLlmContext";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

const DISTINCTIVE_MERCHANT = "Starbucks-alias-XYZ123";
const DISTINCTIVE_TRANSACTION_TITLE = "Anniversary dinner at Le Wine Bar";

// Only the fields buildCoachLlmContext() actually reads, plus the two
// identity-bearing fields it must NEVER read (largestExpense, merchantTotals)
// -- same partial-fixture-cast convention askCoach.test.ts already uses.
const DATA = {
  meta: { generatedAt: "2026-08-21T00:00:00.000Z", transactionCount: 42, monthsOfHistory: 6 },
  financialSnapshot: {
    income: 50123.7,
    expense: 30456.2,
    savings: 19667.5,
    netCashFlow: 19667.5,
    savingRatePercent: 39.2,
    categoryTotals: [
      { category: "Food", amount: 12000.4, percentOfTotal: 39.4 },
      { category: "Transport", amount: 5000, percentOfTotal: 16.4 },
    ],
    merchantTotals: [{ merchant: DISTINCTIVE_MERCHANT, total: 3200, count: 12, largestPurchase: { title: DISTINCTIVE_TRANSACTION_TITLE, amount: 400 } }],
    largestExpense: { title: DISTINCTIVE_TRANSACTION_TITLE, amount: 4500, date: "2026-07-14", category: "Dining" },
  },
  financialHealthScore: { overallScore: 78.6, grade: "B", status: "good" },
  budgetAnalysis: {
    entries: [
      { budget: { category: "Food", amount: 12000, period: "monthly" }, spent: 12000.4, remaining: -0.4, percentage: 100.3, status: "over" },
      { budget: { category: "Transport", amount: 6000, period: "monthly" }, spent: 5000, remaining: 1000, percentage: 83.3, status: "near" },
    ],
  },
  behaviorProfile: {
    profile: { spendingStyle: { primaryStyle: "restaurantLover", confidence: 82.4 } },
    positiveHabits: [{ id: "consistentSaving", polarity: "positive", confidence: 90 }],
    negativeHabits: [{ id: "restaurant", polarity: "negative", confidence: 75 }],
  },
} as unknown as FinancialAnalysisResult;

describe("buildCoachLlmContext", () => {
  it("includes the safe, aggregate-level summary fields", () => {
    const context = buildCoachLlmContext(DATA);

    expect(context).toMatchObject({
      monthsOfHistory: 6,
      transactionCount: 42,
      income: 50124,
      expense: 30456,
      savings: 19668,
      netCashFlow: 19668,
      savingRatePercent: 39,
      healthScore: { overallScore: 79, grade: "B", status: "good" },
      topCategories: [
        { category: "Food", amount: 12000, percentOfTotal: 39 },
        { category: "Transport", amount: 5000, percentOfTotal: 16 },
      ],
      budgets: [
        { category: "Food", status: "over", percentage: 100 },
        { category: "Transport", status: "near", percentage: 83 },
      ],
      behaviorStyle: { primaryStyle: "restaurantLover", confidence: 82 },
      positiveHabitFlags: ["consistentSaving"],
      negativeHabitFlags: ["restaurant"],
    });
  });

  it("never leaks a merchant name or an individual transaction's title -- the actual privacy guarantee", () => {
    const context = buildCoachLlmContext(DATA);
    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain(DISTINCTIVE_MERCHANT);
    expect(serialized).not.toContain(DISTINCTIVE_TRANSACTION_TITLE);
    expect(serialized).not.toContain("merchantTotals");
    expect(serialized).not.toContain("largestExpense");
  });
});
