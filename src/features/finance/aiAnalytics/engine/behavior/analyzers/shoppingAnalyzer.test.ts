import { describe, expect, it } from "vitest";
import { analyzeShoppingSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);

function context(transactions: Transaction[]): BehaviorEngineContext {
  return {
    transactions,
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now,
  };
}

function tx(category: string | undefined, amount: number): Transaction {
  return { title: "Test", amount, type: "expense", account: "Cash", date: "2026-07-15", category };
}

describe("analyzeShoppingSpending", () => {
  it("only totals transactions in a shopping-ish category", () => {
    const result = analyzeShoppingSpending(context([tx("Shopping", 500), tx("Food", 300), tx(undefined, 100)]));
    expect(result.totalSpent).toBe(500);
    expect(result.transactionCount).toBe(1);
  });

  it("matches Retail/Clothing category names too", () => {
    const result = analyzeShoppingSpending(context([tx("Retail", 200), tx("Clothing", 300)]));
    expect(result.totalSpent).toBe(500);
  });

  it("returns an all-zero shape with no shopping-category transactions", () => {
    const result = analyzeShoppingSpending(context([tx("Food", 300)]));
    expect(result).toMatchObject({ totalSpent: 0, transactionCount: 0, topMerchant: null });
  });
});
