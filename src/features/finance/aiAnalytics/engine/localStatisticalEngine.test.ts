import { describe, expect, it } from "vitest";
import { localStatisticalEngine, runAnalysis } from "./localStatisticalEngine";
import type { FinancialAnalysisInput } from "@/features/finance/aiAnalytics/types";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21);

function emptyInput(overrides: Partial<FinancialAnalysisInput> = {}): FinancialAnalysisInput {
  return {
    transactions: [],
    budgets: [],
    categories: [],
    goals: [],
    recipientProfiles: [],
    goalMilestoneEvents: [],
    now,
    ...overrides,
  };
}

describe("runAnalysis", () => {
  it("produces a fully-shaped result with no data", () => {
    const result = runAnalysis(emptyInput());

    expect(result.healthScore.insufficientData).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0); // cashFlowSummary always emitted
    expect(result.spendingAnalysis.topCategories).toEqual([]);
    expect(result.behaviorAnalysis.flags.length).toBeGreaterThan(0);
    expect(result.budgetAnalysis.entries).toEqual([]);
    expect(result.cashFlowAnalysis.monthlyTrend).toHaveLength(6);
    expect(result.forecast.expectedSavings).toBe(0);
    expect(result.recommendations).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(result.meta).toMatchObject({ transactionCount: 0, monthsOfHistory: 0 });
    expect(result.financialSnapshot).toMatchObject({ income: 0, expense: 0, transactionCount: 0, budgetUsagePercent: null });
    expect(result.merchantAnalysis).toEqual([]);
    expect(result.financialHealthScore.insufficientData).toBe(true);
    expect(result.financialHealthScore.overallScore).toBeNull();
    expect(result.financialHealthScore.categoryScores).toHaveLength(7);
    expect(result.actionableRecommendations).toEqual([]);
    expect(result.behaviorProfile.detectedHabits).toEqual([]);
    expect(result.behaviorProfile.profile.spendingStyle.primaryStyle).toBeNull();
    expect(result.behaviorProfile.confidence).toBe(30);
    expect(result.forecastProfile.details.monthlyForecast.period).toBe("monthly");
    expect(result.forecastProfile.details.goalForecast).toEqual([]);
    expect(result.forecastProfile.alerts).toEqual([]);
    expect(result.forecastProfile.supportingMetrics.insufficientData).toBe(true);
    expect(result.executiveSummaryReport.headline.key).toBe("insufficientData");
    expect(result.executiveSummaryReport.highlights.entries).toEqual([]);
    expect(result.executiveSummaryReport.topRecommendations).toEqual([]);
    expect(result.executiveSummaryReport.confidence).toBe(0);
  });

  it("wires financialSnapshot and merchantAnalysis from the same analyzer results as everything else", () => {
    const transactions: Transaction[] = [
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "7-Eleven", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-10", status: "completed", recipient: "recipient-1" },
      { title: "7-Eleven", amount: 150, type: "expense", category: "Food", account: "Cash", date: "2026-07-12", status: "completed", recipient: "recipient-1" },
    ];
    const result = runAnalysis(
      emptyInput({
        transactions,
        recipientProfiles: [{ recipientKey: "recipient-1", alias: "7-Eleven", category: "Food", transactionCount: 2, totalAmount: 250, lastUsedDate: "2026-07-12", confidenceScore: 1 }],
      })
    );

    expect(result.financialSnapshot.income).toBe(result.cashFlowAnalysis.income);
    expect(result.financialSnapshot.currentBalance).toBe(30000 - 250);
    expect(result.merchantAnalysis).toHaveLength(1);
    expect(result.merchantAnalysis[0]).toMatchObject({ alias: "7-Eleven", totalSpending: 250, largestPurchase: { amount: 150 } });
    expect(result.financialHealthScore.insufficientData).toBe(false);
    expect(result.financialHealthScore.overallScore).not.toBeNull();

    expect(result.actionableRecommendations).toHaveLength(result.recommendations.length);
    if (result.actionableRecommendations.length > 0) {
      const [top] = result.actionableRecommendations;
      expect(top.relatedRules).toEqual([result.recommendations.find((r) => r.id === top.id)?.key]);
      expect(top.confidence).toBeGreaterThanOrEqual(0);
      expect(top.confidence).toBeLessThanOrEqual(100);
      expect(top.estimatedAnnualSavings).toBe(top.estimatedMonthlySavings * 12);
    }

    expect(result.behaviorProfile.profile.merchantBehavior).toHaveLength(1);
    expect(result.behaviorProfile.profile.merchantBehavior[0]).toMatchObject({ alias: "7-Eleven", totalSpending: 250 });
    expect(result.behaviorProfile.timeline).toBe(result.timeline);

    expect(result.forecastProfile.trendAnalysis.merchant.mostVisited).toHaveLength(1);
    expect(result.forecastProfile.trendAnalysis.merchant.mostVisited[0].alias).toBe("7-Eleven");
    expect(result.forecastProfile.supportingMetrics.transactionCount).toBe(result.meta.transactionCount);

    expect(result.executiveSummaryReport.topRecommendations).toEqual(result.actionableRecommendations.slice(0, 5));
    expect(result.executiveSummaryReport.overallSummary.overallScore).toBe(result.financialHealthScore.overallScore);
  });

  it("shares a single computed budgetProgress across healthScore, budgetAnalysis, and forecast", () => {
    const transactions: Transaction[] = [
      { title: "Salary", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
      { title: "Food", amount: 900, type: "expense", category: "Food", account: "Cash", date: "2026-07-10", status: "completed" },
    ];
    const result = runAnalysis(
      emptyInput({ transactions, budgets: [{ id: 1, category: "Food", amount: 1000, period: "monthly" }] })
    );

    expect(result.budgetAnalysis.entries[0].spent).toBe(900);
    const budgetUsageSubScore = result.healthScore.subScores.find((s) => s.key === "budgetUsage");
    expect(budgetUsageSubScore?.score).not.toBeNull();
  });

  it("passes cashFlowAnalysis.monthlyTrend through unchanged into spendingAnalysis", () => {
    const result = runAnalysis(emptyInput());
    expect(result.spendingAnalysis.monthlyTrend).toBe(result.cashFlowAnalysis.monthlyTrend);
  });

  it("sets meta.generatedAt to the input's `now`, as an ISO string", () => {
    const result = runAnalysis(emptyInput());
    expect(result.meta.generatedAt).toBe(now.toISOString());
  });
});

describe("localStatisticalEngine", () => {
  it("resolves the same shape as runAnalysis, wrapped in a Promise", async () => {
    const result = await localStatisticalEngine.analyze(emptyInput());
    expect(result.meta.transactionCount).toBe(0);
  });
});
