import { describe, expect, it } from "vitest";
import { respondBudgetStatus } from "./budgetStatusResponder";
import { respondSavingsProgress } from "./savingsProgressResponder";
import { respondCashFlow } from "./cashFlowResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";

function budgetEntry(overrides: Partial<BudgetAnalysisEntry> = {}): BudgetAnalysisEntry {
  return { budget: { id: 1, category: "Food", amount: 1000, period: "monthly" }, spent: 500, remaining: 500, percentage: 50, status: "ok", suggestedMonthlyCap: null, potentialMonthlySavings: null, ...overrides };
}

function emptyCashFlow() {
  return { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] };
}

describe("respondBudgetStatus", () => {
  it("reports the over-budget category as the reason when one exists", () => {
    const entries = [budgetEntry({ status: "ok" }), budgetEntry({ status: "over", budget: { id: 2, category: "Shopping", amount: 2000, period: "monthly" }, spent: 2500 })];
    const data = { budgetAnalysis: { entries, overCount: 1, nearCount: 0, okCount: 1 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondBudgetStatus(data);
    expect(result.answer.params.overCount).toBe(1);
    expect(result.reason.key).toContain("reasonOverBudget");
    expect(result.reason.params.category).toBe("Shopping");
  });

  it("reports on-track when nothing is over budget", () => {
    const data = { budgetAnalysis: { entries: [budgetEntry()], overCount: 0, nearCount: 0, okCount: 1 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondBudgetStatus(data);
    expect(result.reason.key).toContain("reasonOnTrack");
  });

  it("never fabricates when there are no budgets at all", () => {
    const data = { budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondBudgetStatus(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});

describe("respondSavingsProgress", () => {
  it("includes the nearest incomplete goal as the reason when one exists", () => {
    const data = {
      cashFlowAnalysis: { ...emptyCashFlow(), income: 30000, expense: 20000, saving: 10000, savingRatePercent: 33.3 },
      goalProgress: [{ goal: { name: "Vacation", targetAmount: 10000, currentAmount: 4000 }, progressPercent: 40, isComplete: false, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 }],
      actionableRecommendations: [],
    } as unknown as FinancialAnalysisResult;
    const result = respondSavingsProgress(data);
    expect(result.reason.key).toContain("reasonWithGoal");
    expect(result.reason.params.goalName).toBe("Vacation");
  });

  it("falls back to reasonNoGoal when there are no incomplete goals", () => {
    const data = { cashFlowAnalysis: { ...emptyCashFlow(), income: 30000, saving: 5000, savingRatePercent: 20 }, goalProgress: [], actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondSavingsProgress(data);
    expect(result.reason.key).toContain("reasonNoGoal");
  });

  it("never fabricates with zero income and expense", () => {
    const data = { cashFlowAnalysis: emptyCashFlow(), goalProgress: [], actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondSavingsProgress(data);
    expect(result.answer.key).toContain("noData");
  });
});

describe("respondCashFlow", () => {
  it("gives a positive reason when net cash flow is non-negative", () => {
    const data = { cashFlowAnalysis: { ...emptyCashFlow(), income: 30000, expense: 20000, netCashFlow: 10000 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCashFlow(data);
    expect(result.reason.key).toContain("reasonPositive");
  });

  it("reports the shortfall when net cash flow is negative", () => {
    const data = { cashFlowAnalysis: { ...emptyCashFlow(), income: 10000, expense: 15000, netCashFlow: -5000 }, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCashFlow(data);
    expect(result.reason.key).toContain("reasonNegative");
    expect(result.reason.params.shortfall).toBe(5000);
  });

  it("never fabricates with no income or expense at all", () => {
    const data = { cashFlowAnalysis: emptyCashFlow(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondCashFlow(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});
