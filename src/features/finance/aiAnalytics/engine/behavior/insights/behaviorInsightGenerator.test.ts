import { describe, expect, it } from "vitest";
import { generateBehaviorInsights } from "@/features/finance/aiAnalytics/engine/behavior/insights/behaviorInsightGenerator";
import type { BehaviorEngineContext, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { WeekdayAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

const now = new Date(2026, 6, 30);

function emptyDomain(): DomainSpendingAnalysis {
  return { totalSpent: 0, transactionCount: 0, averagePerVisit: 0, averagePerDay: 0, monthlyTrend: [], weeklyTrend: [], topMerchant: null };
}

function domainWithTrend(amounts: number[]): DomainSpendingAnalysis {
  return { ...emptyDomain(), monthlyTrend: amounts.map((amount, i) => ({ periodKey: `2026-0${i + 1}`, amount })) };
}

function weekdayEntry(weekday: number, total: number, count: number): WeekdayAnalysisEntry {
  return { weekday, total, count, average: count > 0 ? total / count : 0 };
}

function context(overrides: Partial<BehaviorEngineContext> = {}): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now,
    ...overrides,
  };
}

describe("generateBehaviorInsights", () => {
  it("returns no insights for a flat, quiet profile", () => {
    expect(generateBehaviorInsights(context(), emptyDomain(), emptyDomain())).toEqual([]);
  });

  it("flags a notable restaurant spending increase", () => {
    const foodAnalysis = domainWithTrend([1000, 1300]); // +30%
    const insights = generateBehaviorInsights(context(), foodAnalysis, emptyDomain());
    expect(insights.some((i) => i.key === "aiAnalytics.behaviorProfile.insights.trend.restaurant.increased")).toBe(true);
  });

  it("flags a notable coffee spending decrease", () => {
    const coffeeAnalysis = domainWithTrend([1000, 700]); // -30%
    const insights = generateBehaviorInsights(context(), emptyDomain(), coffeeAnalysis);
    expect(insights.some((i) => i.key === "aiAnalytics.behaviorProfile.insights.trend.coffee.decreased")).toBe(true);
  });

  it("does not flag a small, unremarkable change", () => {
    const foodAnalysis = domainWithTrend([1000, 1050]); // +5%, below the 15% threshold
    const insights = generateBehaviorInsights(context(), foodAnalysis, emptyDomain());
    expect(insights.some((i) => i.key.includes("trend.restaurant"))).toBe(false);
  });

  it("flags weekend spending as consistently higher when it clearly outpaces weekday averages", () => {
    const weekdayAnalysis = [weekdayEntry(0, 3000, 3), weekdayEntry(6, 3000, 3), weekdayEntry(1, 500, 5), weekdayEntry(2, 500, 5), weekdayEntry(3, 500, 5), weekdayEntry(4, 500, 5), weekdayEntry(5, 500, 5)];
    const insights = generateBehaviorInsights(context({ spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis, weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null } }), emptyDomain(), emptyDomain());
    expect(insights.some((i) => i.key === "aiAnalytics.behaviorProfile.insights.weekendConsistentlyHigher")).toBe(true);
  });

  it("flags frequent late-night purchases when the count meets the threshold", () => {
    const flags: BehaviorFlag[] = [{ key: "nightSpending", transactionCount: 6, totalAmount: 3000, dataQuality: "full" }];
    const insights = generateBehaviorInsights(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }), emptyDomain(), emptyDomain());
    expect(insights.some((i) => i.key === "aiAnalytics.behaviorProfile.insights.frequentLateNight")).toBe(true);
  });

  it("does not flag late-night purchases when time data is unavailable", () => {
    const flags: BehaviorFlag[] = [{ key: "nightSpending", transactionCount: 6, totalAmount: 3000, dataQuality: "unavailable" }];
    const insights = generateBehaviorInsights(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }), emptyDomain(), emptyDomain());
    expect(insights.some((i) => i.key.includes("frequentLateNight"))).toBe(false);
  });
});
