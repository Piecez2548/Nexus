import { describe, expect, it } from "vitest";
import { respondFinancialOverview } from "./financialOverviewResponder";
import { respondExpenseAnalysis } from "./expenseAnalysisResponder";
import { respondIncomeAnalysis } from "./incomeAnalysisResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

function emptySnapshot() {
  return { income: 0, expense: 0, savings: 0, netCashFlow: 0, savingRatePercent: null, budgetUsagePercent: null, categoryTotals: [], merchantTotals: [], transactionCount: 0, averageSpending: 0, largestExpense: null, currentBalance: 0 };
}

function emptyCashFlow() {
  return { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] };
}

function emptySpending() {
  return { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null };
}

describe("respondFinancialOverview", () => {
  it("answers with real numbers when there's transaction history", () => {
    const data = { financialSnapshot: { ...emptySnapshot(), income: 30000, expense: 20000, savings: 10000, currentBalance: 50000, savingRatePercent: 33.3, transactionCount: 5 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondFinancialOverview(data);
    expect(result.answer.key).toContain("hasData");
    expect(result.answer.params.income).toBe(30000);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("never fabricates for a brand-new profile", () => {
    const data = { financialSnapshot: emptySnapshot(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondFinancialOverview(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});

describe("respondExpenseAnalysis", () => {
  it("answers with the top category and largest expense when data exists", () => {
    const data = {
      spendingAnalysis: { ...emptySpending(), topCategories: [{ category: "Food", amount: 5000, percentOfTotal: 50 }] },
      cashFlowAnalysis: { ...emptyCashFlow(), expense: 10000 },
      financialSnapshot: { ...emptySnapshot(), largestExpense: { id: 1, title: "Rent", amount: 8000, category: "Housing", date: "2026-07-01" } },
      actionableRecommendations: [],
    } as unknown as FinancialAnalysisResult;

    const result = respondExpenseAnalysis(data);
    expect(result.answer.params.topCategory).toBe("Food");
    expect(result.reason.params.title).toBe("Rent");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("never fabricates when there's no expense at all", () => {
    const data = { spendingAnalysis: emptySpending(), cashFlowAnalysis: emptyCashFlow(), financialSnapshot: emptySnapshot(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondExpenseAnalysis(data);
    expect(result.answer.key).toContain("noData");
    expect(result.reason.key).toContain("reasonNoData");
  });
});

describe("respondIncomeAnalysis — the honesty path", () => {
  it("answers the amount/trend but never invents a source breakdown", () => {
    const data = { cashFlowAnalysis: { ...emptyCashFlow(), income: 30000, changeVsPreviousMonth: { income: 5, expense: null, saving: null } } } as unknown as FinancialAnalysisResult;
    const result = respondIncomeAnalysis(data);
    expect(result.answer.params.income).toBe(30000);
    expect(result.answer.params.changePercent).toBe(5);
    expect(result.relatedRecommendations).toEqual([]); // no income-category recommendations exist to surface
  });

  it("is capped by the confidence ceiling even with perfect data", () => {
    const data = { cashFlowAnalysis: { ...emptyCashFlow(), income: 30000 } } as unknown as FinancialAnalysisResult;
    const result = respondIncomeAnalysis(data);
    expect(result.confidence).toBeLessThanOrEqual(65);
  });

  it("still states the honesty-path reason even when there's no income data", () => {
    const data = { cashFlowAnalysis: emptyCashFlow() } as unknown as FinancialAnalysisResult;
    const result = respondIncomeAnalysis(data);
    expect(result.answer.key).toContain("noData");
    expect(result.reason.key).toBe("aiAnalytics.aiCoach.answers.incomeAnalysis.reason");
    expect(result.confidence).toBe(0); // no data at all still floors to 0, ceiling only caps the upper bound
  });
});
