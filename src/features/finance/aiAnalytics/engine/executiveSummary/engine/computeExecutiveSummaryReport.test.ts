import { describe, expect, it } from "vitest";
import { computeExecutiveSummaryReport } from "./computeExecutiveSummaryReport";
import type { ExecutiveSummaryEngineContext } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

function emptyBehaviorProfile(): ExecutiveSummaryEngineContext["behaviorProfile"] {
  return {
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
  };
}

function periodForecast() {
  return {
    period: "monthly" as const,
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
    basis: "insufficientData" as const,
  };
}

function emptyForecastProfile(): ExecutiveSummaryEngineContext["forecastProfile"] {
  return {
    summary: { expectedEndOfMonthBalance: 0, expectedSavings: 0, overallConfidence: 0, topAlert: null },
    details: {
      monthlyForecast: periodForecast(),
      weeklyForecast: { ...periodForecast(), period: "weekly", expectedEndOfPeriodBalance: null },
      yearlyForecast: { ...periodForecast(), period: "yearly" },
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
  };
}

function context(overrides: Partial<ExecutiveSummaryEngineContext> = {}): ExecutiveSummaryEngineContext {
  return {
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
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    actionableRecommendations: [],
    behaviorProfile: emptyBehaviorProfile(),
    forecastProfile: emptyForecastProfile(),
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    ...overrides,
  };
}

function rec(id: string): ActionableRecommendation {
  return {
    id,
    priority: "medium",
    category: "food",
    title: { key: "t", params: {} },
    summary: { key: "s", params: {} },
    description: { key: "d", params: {} },
    reason: { key: "r", params: {} },
    supportingMetrics: {},
    confidence: 60,
    estimatedMonthlySavings: 100,
    estimatedAnnualSavings: 1200,
    estimatedFinancialImpact: { monthlySavings: 100, annualSavings: 1200, budgetImprovementPercent: null, savingRateImprovementPercent: null },
    difficulty: "easy",
    expectedCompletionTime: "immediate",
    suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
    relatedRules: ["someRule"],
    createdTime: "2026-07-01T00:00:00.000Z",
  };
}

describe("computeExecutiveSummaryReport", () => {
  it("produces a fully-shaped, empty report for a brand-new profile", () => {
    const result = computeExecutiveSummaryReport(context());
    expect(result.headline.key).toBe("insufficientData");
    expect(result.overallSummary.overallScore).toBeNull();
    expect(result.highlights.entries).toEqual([]);
    expect(result.riskSummary.entries).toEqual([]);
    expect(result.topRecommendations).toEqual([]);
    expect(result.actionPlan).toEqual({ immediate: [], weekly: [], monthly: [], longTerm: [] });
    expect(result.confidence).toBe(0);
  });

  it("wires actionableRecommendations through to topRecommendations and the actionPlan", () => {
    const result = computeExecutiveSummaryReport(context({ actionableRecommendations: [rec("r1"), rec("r2")] }));
    expect(result.topRecommendations).toHaveLength(2);
    expect(result.actionPlan.immediate).toHaveLength(1); // both recs share the same fixture key -> deduped
  });

  it("wires forecastProfile.alerts through to the risk summary", () => {
    const criticalAlert = { id: "a1", type: "budgetOverflow" as const, severity: "critical" as const, message: { key: "m", params: {} }, relatedForecastKey: "x", sourceRecommendationId: null };
    const forecastProfile = { ...emptyForecastProfile(), alerts: [criticalAlert], summary: { ...emptyForecastProfile().summary, topAlert: criticalAlert } };
    const financialHealthScore = { overallScore: 40, grade: "D" as const, status: "poor" as const, insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] };
    const result = computeExecutiveSummaryReport(context({ forecastProfile, financialHealthScore }));

    expect(result.riskSummary.entries).toHaveLength(1);
    // Confirms the same topAlert feeds both riskSummary (via alerts[]) and headline (via summary.topAlert).
    expect(result.headline.key).toBe("budgetRiskDetected");
  });
});
