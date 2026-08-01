// Smoke tests for the 3 thin domainSpendingAnalyzer wrappers — each just
// needs to prove it supplies the right keyword list. The shared matching/
// trend logic is fully covered by domainSpendingAnalyzer.test.ts.
import { describe, expect, it } from "vitest";
import { analyzeFoodSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/foodAnalyzer";
import { analyzeCoffeeSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/coffeeAnalyzer";
import { analyzeTransportSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/transportAnalyzer";
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

function tx(title: string, amount: number): Transaction {
  return { title, amount, type: "expense", account: "Cash", date: "2026-07-15" };
}

describe("domain analyzer wrappers", () => {
  it("analyzeFoodSpending matches eating-out keywords", () => {
    const result = analyzeFoodSpending(context([tx("Restaurant dinner", 300)]));
    expect(result.totalSpent).toBe(300);
  });

  it("analyzeCoffeeSpending matches coffee keywords", () => {
    const result = analyzeCoffeeSpending(context([tx("Starbucks", 150)]));
    expect(result.totalSpent).toBe(150);
  });

  it("analyzeTransportSpending matches transport keywords", () => {
    const result = analyzeTransportSpending(context([tx("Grab ride", 90)]));
    expect(result.totalSpent).toBe(90);
  });

  it("wrappers don't cross-match each other's keywords", () => {
    expect(analyzeCoffeeSpending(context([tx("Grab ride", 90)])).totalSpent).toBe(0);
  });
});
