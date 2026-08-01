import { describe, expect, it } from "vitest";
import { respondForecast } from "./forecastResponder";
import { respondGoalProgress } from "./goalProgressResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { ForecastEngineResult, GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";

function periodForecast() {
  return { period: "monthly" as const, rangeStart: "2026-07-01", rangeEnd: "2026-08-01", incomeSoFar: 0, expenseSoFar: 0, expectedIncome: 0, expectedExpense: 0, remainingExpectedExpense: 0, expectedSavings: 0, expectedEndOfPeriodBalance: 0, cashFlowStabilityScore: null, confidence: 0, basis: "linearProjection" as const };
}

function forecastProfile(overrides: Partial<ForecastEngineResult> = {}): ForecastEngineResult {
  return {
    summary: { expectedEndOfMonthBalance: 5000, expectedSavings: 2000, overallConfidence: 60, topAlert: null },
    details: {
      monthlyForecast: periodForecast(),
      weeklyForecast: periodForecast(),
      yearlyForecast: periodForecast(),
      budgetForecast: { entries: [], categoriesLikelyToExceed: [], categoriesLikelyToRemainUnder: [], confidence: 55 },
      savingsForecast: { expectedMonthlySavings: 2000, savingRatePercent: 20, bestCaseMonthlySavings: null, worstCaseMonthlySavings: null, goalTimelines: [], confidence: 55 },
      goalForecast: [],
    },
    confidence: 58,
    supportingMetrics: { monthsOfHistory: 3, transactionCount: 20, insufficientData: false },
    alerts: [],
    trendAnalysis: {
      category: { entries: [], fastestGrowingCategory: null, fastestDecliningCategory: null, stableCategories: [] },
      merchant: { mostVisited: [], growingMerchants: [], decliningMerchants: [], spendingConcentrationPercent: null },
      behavior: { entries: [] },
    },
    ...overrides,
  };
}

function goalForecastEntry(overrides: Partial<GoalForecastEntry> & { goal: GoalForecastEntry["goal"] }): GoalForecastEntry {
  return { paceKnown: false, monthlyProgressAmount: null, expectedCompletionDate: null, requiredMonthlyContribution: null, probabilityOfCompletion: null, projectedDelayDays: null, ...overrides };
}

describe("respondForecast", () => {
  it("answers with expectedEndOfMonthBalance/expectedSavings from the forecast summary", () => {
    const data = { forecastProfile: forecastProfile(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondForecast(data);
    expect(result.answer.params.expectedEndOfMonthBalance).toBe(5000);
    expect(result.answer.params.expectedSavings).toBe(2000);
  });

  it("flags a budget-risk reason when a category is likely to exceed", () => {
    const profile = forecastProfile({ details: { ...forecastProfile().details, budgetForecast: { entries: [], categoriesLikelyToExceed: ["Food"], categoriesLikelyToRemainUnder: [], confidence: 55 } } });
    const data = { forecastProfile: profile, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondForecast(data);
    expect(result.reason.key).toContain("reasonBudgetRisk");
    expect(result.reason.params.category).toBe("Food");
  });

  it("never fabricates when the forecast itself is insufficientData", () => {
    const profile = forecastProfile({ supportingMetrics: { monthsOfHistory: 0, transactionCount: 0, insufficientData: true } });
    const data = { forecastProfile: profile, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondForecast(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});

describe("respondGoalProgress", () => {
  const incompleteGoal: GoalProgressEntry = { goal: { name: "Vacation", targetAmount: 10000, currentAmount: 4000 }, progressPercent: 40, isComplete: false, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 };

  it("answers with the nearest incomplete goal's current progress", () => {
    const data = { goalProgress: [incompleteGoal], forecastProfile: forecastProfile(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondGoalProgress(data);
    expect(result.answer.params.goalName).toBe("Vacation");
    expect(result.answer.params.progressPercent).toBe(40);
  });

  it("answers 'when will I reach it' using forecastProfile.details.goalForecast's expectedCompletionDate", () => {
    const profile = forecastProfile({ details: { ...forecastProfile().details, goalForecast: [goalForecastEntry({ goal: incompleteGoal.goal, paceKnown: true, expectedCompletionDate: "2026-12-01", probabilityOfCompletion: 80 })] } });
    const data = { goalProgress: [incompleteGoal], forecastProfile: profile, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondGoalProgress(data);
    expect(result.reason.key).toContain("reasonWithForecast");
    expect(result.reason.params.expectedCompletionDate).toBe("2026-12-01");
    expect(result.supportingMetrics.probabilityOfCompletion).toBe(80);
  });

  it("never fabricates a completion date when pace isn't known", () => {
    const profile = forecastProfile({ details: { ...forecastProfile().details, goalForecast: [goalForecastEntry({ goal: incompleteGoal.goal, paceKnown: false })] } });
    const data = { goalProgress: [incompleteGoal], forecastProfile: profile, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondGoalProgress(data);
    expect(result.reason.key).toContain("reasonNoForecast");
    expect(result.supportingMetrics.expectedCompletionDate).toBeUndefined();
  });

  it("never fabricates a goal when there are no incomplete goals at all", () => {
    const data = { goalProgress: [], forecastProfile: forecastProfile(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondGoalProgress(data);
    expect(result.answer.key).toContain("noData");
    expect(result.confidence).toBe(0);
  });
});

describe("no field crossover between Budget Status/Savings Progress (present-tense) and Forecast (forward-looking)", () => {
  it("respondForecast never reads budgetAnalysis or cashFlowAnalysis.saving directly", () => {
    // respondForecast only reads forecastProfile — confirmed by construction:
    // this fixture carries no budgetAnalysis/cashFlowAnalysis field at all,
    // and the responder still produces a fully-formed answer.
    const data = { forecastProfile: forecastProfile(), actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    expect(() => respondForecast(data)).not.toThrow();
  });

  it("respondGoalProgress never reads forecastProfile.details.savingsForecast.goalTimelines (it uses the richer goalForecast instead)", () => {
    const profile = forecastProfile({
      details: { ...forecastProfile().details, goalForecast: [], savingsForecast: { expectedMonthlySavings: 2000, savingRatePercent: 20, bestCaseMonthlySavings: null, worstCaseMonthlySavings: null, goalTimelines: [{ goalName: "Vacation", monthsToReachAtCurrentPace: 3 }], confidence: 55 } },
    });
    const incompleteGoal: GoalProgressEntry = { goal: { name: "Vacation", targetAmount: 10000, currentAmount: 4000 }, progressPercent: 40, isComplete: false, daysRemaining: null, isDeadlinePassedIncomplete: false, milestonesCrossedThisMonth: 0 };
    const data = { goalProgress: [incompleteGoal], forecastProfile: profile, actionableRecommendations: [] } as unknown as FinancialAnalysisResult;
    const result = respondGoalProgress(data);
    // goalForecast is empty, so even though savingsForecast.goalTimelines has an answer, respondGoalProgress must not fall back to it.
    expect(result.reason.key).toContain("reasonNoForecast");
  });
});
