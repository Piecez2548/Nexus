import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFinancialAnalysis } from "./useFinancialAnalysis";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import type { FinancialAnalysisResult, FinancialIntelligenceEngine } from "@/features/finance/aiAnalytics/types";

const now = new Date(2026, 6, 21);

function resetStores() {
  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false });
  useCategoryStore.setState({ categories: [], loading: false });
  useGoalStore.setState({ goals: [], loading: false });
  useRecipientProfileStore.setState({ profiles: [], loading: false });
  useGoalMilestoneEventStore.setState({ events: [], loading: false });
}

function stubResult(overrides: Partial<FinancialAnalysisResult> = {}): FinancialAnalysisResult {
  return {
    healthScore: { score: null, grade: null, insufficientData: true, subScores: [] },
    insights: [],
    spendingAnalysis: {
      topCategories: [],
      categoryComparison: [],
      monthlyTrend: [],
      dailyTrend: [],
      weekdayAnalysis: [],
      weeklyTrend: [],
      highestSpendingDay: null,
      mostExpensiveWeek: null,
    },
    behaviorAnalysis: {
      flags: [],
      largePurchases: [],
      topMerchants: [],
      subscriptions: [],
      impulsePurchases: [],
      mostActiveHour: { hour: null, dataQuality: "unavailable" },
      mostActiveWeekday: null,
    },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    cashFlowAnalysis: {
      income: 0,
      expense: 0,
      saving: 0,
      savingRatePercent: null,
      netCashFlow: 0,
      changeVsPreviousMonth: { income: null, expense: null, saving: null },
      monthlyTrend: [],
    },
    forecast: { expectedEndOfMonthBalance: 0, expectedSavings: 0, budgetOverflowRisk: [], futureCashFlowTrend: { basis: "insufficientData", projectedMonthlyNet: null } },
    recommendations: [],
    timeline: [],
    executiveSummary: [],
    transactionStatistics: {
      averageDailySpending: 0,
      averageWeeklySpending: 0,
      averageMonthlySpending: 0,
      averageTransaction: 0,
      largestTransaction: null,
      smallestTransaction: null,
    },
    goalProgress: [],
    financialSnapshot: {
      income: 0,
      expense: 0,
      savings: 0,
      netCashFlow: 0,
      savingRatePercent: null,
      budgetUsagePercent: null,
      categoryTotals: [],
      merchantTotals: [],
      transactionCount: 0,
      averageSpending: 0,
      largestExpense: null,
      currentBalance: 0,
    },
    merchantAnalysis: [],
    summary: { headline: null, positiveHighlights: [], negativeHighlights: [], opportunities: [], risks: [], nextActions: [] },
    financialHealthScore: {
      overallScore: null,
      grade: null,
      status: null,
      insufficientData: true,
      categoryScores: [],
      strengths: [],
      weaknesses: [],
      warnings: [],
      recommendations: [],
      improvementOpportunities: [],
    },
    actionableRecommendations: [],
    behaviorProfile: {
      profile: {
        spendingStyle: { primaryStyle: null, confidence: 0, scores: { budgetConscious: 0, impulseSpender: 0, restaurantLover: 0, coffeeEnthusiast: 0, shoppingEnthusiast: 0, disciplinedSaver: 0, balancedSpender: 0, growingSaver: 0, highRiskSpender: 0 } },
        foodAnalysis: { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null },
        coffeeAnalysis: { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null },
        shoppingAnalysis: { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null },
        transportAnalysis: { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null },
        timeAnalysis: { dataQuality: "unavailable", byTimeOfDay: [], byHourWeekday: [] },
        merchantBehavior: [],
        recurringPatterns: [],
        seasonalPattern: { beginning: 0, middle: 0, end: 0, dominantPhase: "even" },
      },
      scores: { overall: null, restaurant: null, shopping: null, coffee: null, budgetDiscipline: null, impulseControl: null, consistency: null },
      timeline: [],
      detectedHabits: [],
      positiveHabits: [],
      negativeHabits: [],
      improvementOpportunities: [],
      insights: [],
      recommendations: [],
      confidence: 30,
    },
    forecastProfile: {
      summary: { expectedEndOfMonthBalance: 0, expectedSavings: 0, overallConfidence: 0, topAlert: null },
      details: {
        monthlyForecast: {
          period: "monthly",
          rangeStart: "2026-07-01",
          rangeEnd: "2026-08-01",
          incomeSoFar: 0,
          expenseSoFar: 0,
          expectedIncome: 0,
          expectedExpense: 0,
          remainingExpectedExpense: 0,
          expectedSavings: 0,
          expectedEndOfPeriodBalance: 0,
          cashFlowStabilityScore: null,
          confidence: 0,
          basis: "insufficientData",
        },
        weeklyForecast: {
          period: "weekly",
          rangeStart: "2026-07-20",
          rangeEnd: "2026-07-27",
          incomeSoFar: 0,
          expenseSoFar: 0,
          expectedIncome: 0,
          expectedExpense: 0,
          remainingExpectedExpense: 0,
          expectedSavings: 0,
          expectedEndOfPeriodBalance: null,
          cashFlowStabilityScore: null,
          confidence: 0,
          basis: "insufficientData",
        },
        yearlyForecast: {
          period: "yearly",
          rangeStart: "2026-01-01",
          rangeEnd: "2027-01-01",
          incomeSoFar: 0,
          expenseSoFar: 0,
          expectedIncome: 0,
          expectedExpense: 0,
          remainingExpectedExpense: 0,
          expectedSavings: 0,
          expectedEndOfPeriodBalance: 0,
          cashFlowStabilityScore: null,
          confidence: 0,
          basis: "insufficientData",
        },
        budgetForecast: { entries: [], categoriesLikelyToExceed: [], categoriesLikelyToRemainUnder: [], confidence: 0 },
        savingsForecast: { expectedMonthlySavings: 0, savingRatePercent: null, bestCaseMonthlySavings: null, worstCaseMonthlySavings: null, goalTimelines: [], confidence: 0 },
        goalForecast: [],
      },
      confidence: 0,
      supportingMetrics: { monthsOfHistory: 0, transactionCount: 0, insufficientData: true },
      alerts: [],
      trendAnalysis: {
        category: { entries: [], fastestGrowingCategory: null, fastestDecliningCategory: null, stableCategories: [] },
        merchant: { mostVisited: [], growingMerchants: [], decliningMerchants: [], spendingConcentrationPercent: null },
        behavior: { entries: [] },
      },
    },
    executiveSummaryReport: {
      headline: { key: "insufficientData", message: { key: "aiAnalytics.executiveSummaryReport.headline.insufficientData", params: {} } },
      overallSummary: { overallScore: null, grade: null, status: null, insufficientData: true, topStrengths: [], topWeaknesses: [] },
      highlights: { entries: [] },
      behaviorSummary: {
        spendingStyle: { primaryStyle: null, confidence: 0, scores: { budgetConscious: 0, impulseSpender: 0, restaurantLover: 0, coffeeEnthusiast: 0, shoppingEnthusiast: 0, disciplinedSaver: 0, balancedSpender: 0, growingSaver: 0, highRiskSpender: 0 } },
        insights: [],
        topPositiveHabits: [],
        topNegativeHabits: [],
        confidence: 30,
      },
      forecastSummary: { expectedEndOfMonthBalance: 0, expectedSavings: 0, categoriesLikelyToExceed: [], categoriesLikelyToRemainUnder: [], goalsAtRisk: [], cashFlowStabilityScore: null, confidence: 0 },
      riskSummary: { entries: [] },
      topRecommendations: [],
      actionPlan: { immediate: [], weekly: [], monthly: [], longTerm: [] },
      confidence: 0,
    },
    meta: { generatedAt: now.toISOString(), transactionCount: 0, monthsOfHistory: 0 },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFinancialAnalysis", () => {
  beforeEach(() => {
    resetStores();
  });

  it("renders the given engine's output verbatim once resolved", async () => {
    const result = stubResult({ meta: { generatedAt: now.toISOString(), transactionCount: 3, monthsOfHistory: 2 } });
    const engine: FinancialIntelligenceEngine = { analyze: () => Promise.resolve(result) };

    const { result: hookResult } = renderHook(() => useFinancialAnalysis(engine, now));

    expect(hookResult.current.loading).toBe(true);
    await waitFor(() => expect(hookResult.current.loading).toBe(false));

    expect(hookResult.current.data).toBe(result);
    expect(hookResult.current.error).toBeNull();
  });

  it("surfaces a rejected analyze() as an error", async () => {
    const engine: FinancialIntelligenceEngine = { analyze: () => Promise.reject(new Error("boom")) };

    const { result: hookResult } = renderHook(() => useFinancialAnalysis(engine, now));

    await waitFor(() => expect(hookResult.current.loading).toBe(false));
    expect(hookResult.current.error).toBe("boom");
    expect(hookResult.current.data).toBeNull();
  });

  it("never lets a slower, earlier-started request overwrite a faster, later one", async () => {
    const slow = deferred<FinancialAnalysisResult>();
    const fast = deferred<FinancialAnalysisResult>();
    let call = 0;

    const engine: FinancialIntelligenceEngine = {
      analyze: () => {
        call += 1;
        return call === 1 ? slow.promise : fast.promise;
      },
    };

    const { result: hookResult, rerender } = renderHook(({ now }) => useFinancialAnalysis(engine, now), {
      initialProps: { now },
    });

    // Trigger a second call (different `now` -> new memoized input) before
    // the first has resolved.
    rerender({ now: new Date(now.getTime() + 1000) });

    const fastResult = stubResult({ meta: { generatedAt: "fast", transactionCount: 1, monthsOfHistory: 1 } });
    const slowResult = stubResult({ meta: { generatedAt: "slow", transactionCount: 99, monthsOfHistory: 6 } });

    fast.resolve(fastResult);
    await waitFor(() => expect(hookResult.current.data).toBe(fastResult));

    // The slow (first) request resolves afterward — it must be ignored.
    slow.resolve(slowResult);
    await new Promise((r) => setTimeout(r, 0));

    expect(hookResult.current.data).toBe(fastResult);
  });
});
