import { describe, expect, it } from "vitest";
import { detectSalaryDayHabit } from "@/features/finance/aiAnalytics/engine/behavior/detectors/salaryDayDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "large-spending-after-salary",
    key: "largeSpendingAfterSalary",
    priority: "low",
    estimatedMonthlySavings: 0,
    confidence: "medium",
    estimatedImpact: null,
    params: { amount: 5000 },
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "action", params: {} },
    ...overrides,
  };
}

function context(recommendations: Recommendation[]): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations,
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now: new Date(2026, 6, 30),
  };
}

describe("detectSalaryDayHabit", () => {
  it("is null when the largeSpendingAfterSalary rule never fired", () => {
    expect(detectSalaryDayHabit(context([]))).toBeNull();
  });

  it("is negative and carries the rule's params when it fired", () => {
    const result = detectSalaryDayHabit(context([rec({ confidence: "high" })]));
    expect(result?.polarity).toBe("negative");
    expect(result?.supportingMetrics).toEqual({ amount: 5000 });
    expect(result?.confidence).toBe(85);
  });

  it("maps the rule's confidence tier to a numeric value", () => {
    expect(detectSalaryDayHabit(context([rec({ confidence: "low" })]))?.confidence).toBe(35);
  });
});
