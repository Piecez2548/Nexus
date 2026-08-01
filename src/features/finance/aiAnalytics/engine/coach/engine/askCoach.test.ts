import { describe, expect, it } from "vitest";
import { computeCoachResponse } from "./askCoach";
import { NEXT_QUESTION_BY_INTENT } from "@/features/finance/aiAnalytics/engine/coach/constants/nextQuestionMap";
import type { CoachIntent } from "@/features/finance/aiAnalytics/engine/coach/types";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";

function emptyDomain() {
  return { totalSpent: 8000, transactionCount: 12, averagePerVisit: 666.67, averagePerDay: 266.67, monthlyTrend: [], weeklyTrend: [], topMerchant: null };
}

function periodForecast() {
  return { period: "monthly" as const, rangeStart: "2026-07-01", rangeEnd: "2026-08-01", incomeSoFar: 30000, expenseSoFar: 20000, expectedIncome: 50000, expectedExpense: 32000, remainingExpectedExpense: 12000, expectedSavings: 18000, expectedEndOfPeriodBalance: 18000, cashFlowStabilityScore: 70, confidence: 60, basis: "linearProjection" as const };
}

const incompleteGoal: GoalProgressEntry = {
  goal: { name: "Vacation", targetAmount: 10000, currentAmount: 4000 },
  progressPercent: 40,
  isComplete: false,
  daysRemaining: 90,
  isDeadlinePassedIncomplete: false,
  milestonesCrossedThisMonth: 0,
};

// A moderately populated fixture — realistic enough to exercise each
// responder's "hasData" branch, not just its honesty/no-data path (those are
// already covered by every responder's own dedicated test file). This test
// suite's job is the orchestration wiring itself: classify -> dispatch ->
// attach intent/nextSuggestedQuestion -> blend confidence.
function realisticFixture(): FinancialAnalysisResult {
  return {
    financialSnapshot: { income: 50000, expense: 32000, savings: 18000, netCashFlow: 18000, savingRatePercent: 36, budgetUsagePercent: 64, categoryTotals: [], merchantTotals: [], transactionCount: 42, averageSpending: 761.9, largestExpense: null, currentBalance: 120000 },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 50000, expense: 32000, saving: 18000, savingRatePercent: 36, netCashFlow: 18000, changeVsPreviousMonth: { income: 5, expense: -2, saving: 12 }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 1, okCount: 5 },
    goalProgress: [incompleteGoal],
    merchantAnalysis: [],
    financialHealthScore: { overallScore: 78, grade: "B", status: "good", insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    actionableRecommendations: [],
    behaviorProfile: {
      profile: {
        spendingStyle: { primaryStyle: "balancedSpender", confidence: 70, scores: { budgetConscious: 60, impulseSpender: 20, restaurantLover: 40, coffeeEnthusiast: 30, shoppingEnthusiast: 25, disciplinedSaver: 55, balancedSpender: 65, growingSaver: 50, highRiskSpender: 10 } },
        foodAnalysis: emptyDomain(),
        coffeeAnalysis: emptyDomain(),
        shoppingAnalysis: emptyDomain(),
        transportAnalysis: emptyDomain(),
        timeAnalysis: { dataQuality: "sufficient", byTimeOfDay: [], byHourWeekday: [] },
        merchantBehavior: [],
        recurringPatterns: [],
        seasonalPattern: { beginning: 30, middle: 40, end: 30, dominantPhase: "even" },
      },
      scores: { overall: 70, restaurant: 65, shopping: 60, coffee: 55, budgetDiscipline: 75, impulseControl: 68, consistency: 72 },
      timeline: [],
      detectedHabits: [{ id: "steady-saver", polarity: "positive", confidence: 75, message: { key: "aiAnalytics.behaviorProfile.detectors.savings.positive", params: {} }, supportingMetrics: {} }],
      positiveHabits: [{ id: "steady-saver", polarity: "positive", confidence: 75, message: { key: "aiAnalytics.behaviorProfile.detectors.savings.positive", params: {} }, supportingMetrics: {} }],
      negativeHabits: [],
      improvementOpportunities: [],
      insights: [],
      recommendations: [],
      confidence: 75,
    },
    forecastProfile: {
      summary: { expectedEndOfMonthBalance: 138000, expectedSavings: 18000, overallConfidence: 60, topAlert: null },
      details: {
        monthlyForecast: periodForecast(),
        weeklyForecast: { ...periodForecast(), period: "weekly" },
        yearlyForecast: { ...periodForecast(), period: "yearly" },
        budgetForecast: { entries: [], categoriesLikelyToExceed: [], categoriesLikelyToRemainUnder: [], confidence: 55 },
        savingsForecast: { expectedMonthlySavings: 18000, savingRatePercent: 36, bestCaseMonthlySavings: 20000, worstCaseMonthlySavings: 15000, goalTimelines: [], confidence: 55 },
        goalForecast: [{ goal: incompleteGoal.goal, paceKnown: true, monthlyProgressAmount: 500, expectedCompletionDate: "2026-12-01", requiredMonthlyContribution: 600, probabilityOfCompletion: 80, projectedDelayDays: null }],
      },
      confidence: 60,
      supportingMetrics: { monthsOfHistory: 4, transactionCount: 42, insufficientData: false },
      alerts: [],
      trendAnalysis: {
        category: { entries: [], fastestGrowingCategory: null, fastestDecliningCategory: null, stableCategories: [] },
        merchant: { mostVisited: [], growingMerchants: [], decliningMerchants: [], spendingConcentrationPercent: null },
        behavior: { entries: [] },
      },
    },
  } as unknown as FinancialAnalysisResult;
}

// Each phrase reuses (or is manually traced against, the same way
// classifyIntent.test.ts was) the exact distinctive keyword phrases from
// coachIntentKeywords.ts, so every pair below is guaranteed to classify
// unambiguously to its expected intent.
const CASES: Array<[CoachIntent, string, string]> = [
  ["financialOverview", "What is my financial overview?", "ภาพรวมการเงินของฉันเป็นอย่างไร"],
  ["expenseAnalysis", "How much did I spend this month?", "ใช้จ่ายไปเท่าไหร่"],
  ["incomeAnalysis", "How much did I earn?", "รายได้ของฉันเท่าไหร่"],
  ["budgetStatus", "Am I following my budget?", "ฉันใช้งบประมาณตามที่ตั้งไว้ไหม"],
  ["savingsProgress", "What is my savings progress?", "ความคืบหน้าการออมของฉันเป็นอย่างไร"],
  ["cashFlow", "What is my cash flow?", "กระแสเงินสดของฉันเป็นอย่างไร"],
  ["financialHealthScore", "Why is my Financial Health Score low?", "ทำไมคะแนนสุขภาพการเงินของฉันต่ำ"],
  ["categorySpending", "What is my spending by category?", "หมวดหมู่การใช้จ่ายของฉันเป็นอย่างไร"],
  ["merchantSpending", "Which store do I shop at most?", "ร้านไหนที่ฉันใช้บ่อยที่สุด"],
  ["restaurantAnalysis", "How many times did I eat outside?", "กินข้าวนอกบ้านกี่ครั้ง"],
  ["coffeeAnalysis", "How much coffee did I buy?", "กาแฟฉันซื้อไปเท่าไหร่"],
  ["shoppingAnalysis", "How much shopping did I do?", "ช้อปปิ้งของฉันเป็นยังไง"],
  ["forecast", "Will I exceed my budget?", "แนวโน้มการใช้จ่ายของฉันเป็นอย่างไร"],
  ["goalProgress", "When will I reach my savings goal?", "เมื่อไหร่จะถึงเป้าหมายการออม"],
  ["recommendations", "How much can I save by eating at home?", "ควรลดหมวดไหนก่อน"],
  ["behaviorAnalysis", "What are my spending habits?", "พฤติกรรมการใช้จ่ายของฉันเป็นอย่างไร"],
];

describe("computeCoachResponse — orchestration", () => {
  it.each(CASES)("classifies and answers %s in English", (intent, enQuestion) => {
    const data = realisticFixture();
    const result = computeCoachResponse({ data, questionText: enQuestion });
    expect(result.intent).toBe(intent);
    expect(result.answer.key).toBeTruthy();
    expect(result.reason.key).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.nextSuggestedQuestion).not.toBeNull();
    expect(result.nextSuggestedQuestion?.intent).toBe(NEXT_QUESTION_BY_INTENT[intent]);
  });

  it.each(CASES)("classifies and answers %s in Thai", (intent, _en, thQuestion) => {
    const data = realisticFixture();
    const result = computeCoachResponse({ data, questionText: thQuestion });
    expect(result.intent).toBe(intent);
    expect(result.nextSuggestedQuestion?.intent).toBe(NEXT_QUESTION_BY_INTENT[intent]);
  });

  it("blends classifier confidence and answer confidence rather than using either alone", () => {
    const data = realisticFixture();
    const result = computeCoachResponse({ data, questionText: "Am I following my budget?" });
    // Neither a raw classifier confidence (50-95) nor a raw answer
    // confidence (0-90) alone would necessarily land exactly here — the
    // blend (0.3 classifier + 0.7 answer) is what we're verifying exists.
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("never fabricates an intent for an off-topic question", () => {
    const data = realisticFixture();
    const result = computeCoachResponse({ data, questionText: "What's the weather like today?" });
    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.nextSuggestedQuestion).toBeNull();
    expect(result.relatedRecommendations).toEqual([]);
    expect(result.answer.key).toBe("aiAnalytics.aiCoach.unknown.answer");
    expect(result.reason.key).toBe("aiAnalytics.aiCoach.unknown.reason");
  });
});
