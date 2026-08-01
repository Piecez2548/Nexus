import { describe, expect, it } from "vitest";
import { RESPONDER_REGISTRY } from "./responderRegistry";
import type { CoachIntent } from "@/features/finance/aiAnalytics/engine/coach/types";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";

const ALL_INTENTS: CoachIntent[] = [
  "financialOverview",
  "expenseAnalysis",
  "incomeAnalysis",
  "budgetStatus",
  "savingsProgress",
  "cashFlow",
  "financialHealthScore",
  "categorySpending",
  "merchantSpending",
  "restaurantAnalysis",
  "coffeeAnalysis",
  "shoppingAnalysis",
  "forecast",
  "goalProgress",
  "recommendations",
  "behaviorAnalysis",
];

function emptyDomain() {
  return { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null };
}

function periodForecast() {
  return { period: "monthly" as const, rangeStart: "2026-07-01", rangeEnd: "2026-08-01", incomeSoFar: 0, expenseSoFar: 0, expectedIncome: 0, expectedExpense: 0, remainingExpectedExpense: 0, expectedSavings: 0, expectedEndOfPeriodBalance: 0, cashFlowStabilityScore: null, confidence: 0, basis: "insufficientData" as const };
}

function emptyFinancialAnalysisResult(): FinancialAnalysisResult {
  return {
    financialSnapshot: { income: 0, expense: 0, savings: 0, netCashFlow: 0, savingRatePercent: null, budgetUsagePercent: null, categoryTotals: [], merchantTotals: [], transactionCount: 0, averageSpending: 0, largestExpense: null, currentBalance: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    goalProgress: [],
    merchantAnalysis: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    actionableRecommendations: [],
    behaviorProfile: {
      profile: {
        spendingStyle: { primaryStyle: null, confidence: 0, scores: { budgetConscious: 0, impulseSpender: 0, restaurantLover: 0, coffeeEnthusiast: 0, shoppingEnthusiast: 0, disciplinedSaver: 0, balancedSpender: 0, growingSaver: 0, highRiskSpender: 0 } },
        foodAnalysis: emptyDomain(),
        coffeeAnalysis: emptyDomain(),
        shoppingAnalysis: emptyDomain(),
        transportAnalysis: emptyDomain(),
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
    },
  } as unknown as FinancialAnalysisResult;
}

describe("RESPONDER_REGISTRY", () => {
  it("has an entry for all 16 intents", () => {
    expect(Object.keys(RESPONDER_REGISTRY).sort()).toEqual([...ALL_INTENTS].sort());
  });

  it("every responder returns a fully-shaped, non-fabricating response for a brand-new empty profile", () => {
    const data = emptyFinancialAnalysisResult();
    for (const intent of ALL_INTENTS) {
      const result = RESPONDER_REGISTRY[intent](data);
      expect(result.answer.key, `${intent} answer.key`).toBeTruthy();
      expect(result.reason.key, `${intent} reason.key`).toBeTruthy();
      expect(result.confidence, `${intent} confidence`).toBeGreaterThanOrEqual(0);
      expect(result.confidence, `${intent} confidence`).toBeLessThanOrEqual(100);
      expect(result.relatedRecommendations, `${intent} relatedRecommendations`).toEqual([]);
    }
  });
});
