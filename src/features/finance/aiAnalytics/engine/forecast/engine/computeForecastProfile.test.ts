import { describe, expect, it } from "vitest";
import { computeForecastProfile } from "./computeForecastProfile";
import type { ForecastEngineContext } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

const now = new Date(2026, 6, 15);

const emptyBehaviorProfile: ForecastEngineContext["behaviorProfile"] = {
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

function context(overrides: Partial<ForecastEngineContext> = {}): ForecastEngineContext {
  return {
    transactions: [],
    budgets: [],
    goals: [],
    goalMilestoneEvents: [],
    recipientProfiles: [],
    budgetProgress: [],
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    merchantAnalysis: [],
    goalProgress: [],
    recommendations: [],
    behaviorProfile: emptyBehaviorProfile,
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    monthsOfHistory: 0,
    now,
    ...overrides,
  };
}

describe("computeForecastProfile", () => {
  it("produces a fully-shaped result for a brand-new, empty profile", () => {
    const result = computeForecastProfile(context());

    expect(result.details.monthlyForecast.period).toBe("monthly");
    expect(result.details.weeklyForecast.period).toBe("weekly");
    expect(result.details.yearlyForecast.period).toBe("yearly");
    expect(result.details.budgetForecast.entries).toEqual([]);
    expect(result.details.goalForecast).toEqual([]);
    expect(result.trendAnalysis.category.entries).toEqual([]);
    expect(result.trendAnalysis.merchant.mostVisited).toEqual([]);
    expect(result.trendAnalysis.behavior.entries).toHaveLength(5);
    expect(result.alerts).toEqual([]);
    expect(result.supportingMetrics.insufficientData).toBe(true);
    expect(result.summary.topAlert).toBeNull();
  });

  it("surfaces the highest-severity alert as topAlert", () => {
    const recommendations: Recommendation[] = [
      { id: "r1", key: "forecastBudgetOverflow", priority: "high", estimatedMonthlySavings: 0, confidence: "medium", estimatedImpact: null, params: {}, title: { key: "a", params: {} }, reason: { key: "a", params: {} }, action: { key: "a", params: {} } },
      { id: "r2", key: "repeatedNegativeCashFlow", priority: "critical", estimatedMonthlySavings: 0, confidence: "high", estimatedImpact: null, params: {}, title: { key: "b", params: {} }, reason: { key: "b", params: {} }, action: { key: "b", params: {} } },
    ];
    const result = computeForecastProfile(context({ recommendations }));
    expect(result.summary.topAlert?.severity).toBe("critical");
    expect(result.alerts).toHaveLength(2);
  });

  it("wires merchantAnalysis straight into the merchant trend section", () => {
    const merchantAnalysis: ForecastEngineContext["merchantAnalysis"] = [
      { alias: "Shopee", frequency: 5, totalSpending: 1000, averagePurchase: 200, largestPurchase: null, monthlyGrowthPercent: 40, categories: ["Shopping"], recommendations: [] },
    ];
    const result = computeForecastProfile(context({ merchantAnalysis }));
    expect(result.trendAnalysis.merchant.mostVisited).toHaveLength(1);
    expect(result.trendAnalysis.merchant.growingMerchants[0].alias).toBe("Shopee");
  });

  it("overall confidence is the average of the sub-forecast confidences", () => {
    const result = computeForecastProfile(context());
    const { monthlyForecast, weeklyForecast, yearlyForecast, budgetForecast, savingsForecast } = result.details;
    const expected = Math.round((monthlyForecast.confidence + weeklyForecast.confidence + yearlyForecast.confidence + budgetForecast.confidence + savingsForecast.confidence) / 5);
    expect(result.confidence).toBe(expected);
    expect(result.summary.overallConfidence).toBe(result.confidence);
  });
});
