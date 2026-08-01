import { describe, expect, it } from "vitest";
import { analyzeTimeOfDay } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/timeAnalyzer";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30);

function context(transactions: Transaction[]): BehaviorEngineContext {
  return {
    transactions,
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
  };
}

function tx(date: string, time: string | undefined, amount = 100): Transaction {
  return { title: "Test", amount, type: "expense", account: "Cash", date, time };
}

describe("analyzeTimeOfDay", () => {
  it("is unavailable data quality with no time-bearing transactions", () => {
    const result = analyzeTimeOfDay(context([tx("2026-07-15", undefined)]));
    expect(result.dataQuality).toBe("unavailable");
    expect(result.byTimeOfDay.every((b) => b.transactionCount === 0)).toBe(true);
  });

  it("buckets an 8am transaction as morning", () => {
    const result = analyzeTimeOfDay(context([tx("2026-07-15", "08:30")]));
    const morning = result.byTimeOfDay.find((b) => b.bucket === "morning");
    expect(morning?.transactionCount).toBe(1);
    expect(morning?.totalAmount).toBe(100);
  });

  it("buckets a 12pm transaction as lunch, a 7pm as dinner, an 11pm as night, and a 2am as lateNight", () => {
    const result = analyzeTimeOfDay(
      context([tx("2026-07-15", "12:00"), tx("2026-07-15", "19:00"), tx("2026-07-15", "23:00"), tx("2026-07-15", "02:00")])
    );
    expect(result.byTimeOfDay.find((b) => b.bucket === "lunch")?.transactionCount).toBe(1);
    expect(result.byTimeOfDay.find((b) => b.bucket === "dinner")?.transactionCount).toBe(1);
    expect(result.byTimeOfDay.find((b) => b.bucket === "night")?.transactionCount).toBe(1);
    expect(result.byTimeOfDay.find((b) => b.bucket === "lateNight")?.transactionCount).toBe(1);
  });

  it("always returns exactly 168 hour x weekday cells", () => {
    const result = analyzeTimeOfDay(context([tx("2026-07-15", "08:30")]));
    expect(result.byHourWeekday).toHaveLength(168);
  });

  it("places a transaction's amount into the correct weekday x hour cell", () => {
    // 2026-07-15 is a Wednesday (weekday 3).
    const result = analyzeTimeOfDay(context([tx("2026-07-15", "08:30", 250)]));
    const cell = result.byHourWeekday.find((c) => c.weekday === 3 && c.hour === 8);
    expect(cell?.totalAmount).toBe(250);
    expect(cell?.transactionCount).toBe(1);
  });

  it("is full data quality when every transaction in the window has a time", () => {
    const result = analyzeTimeOfDay(context([tx("2026-07-15", "08:30"), tx("2026-07-16", "09:00")]));
    expect(result.dataQuality).toBe("full");
  });
});
