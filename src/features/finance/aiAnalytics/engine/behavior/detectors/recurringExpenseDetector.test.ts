import { describe, expect, it } from "vitest";
import { detectRecurringExpenseHabits } from "@/features/finance/aiAnalytics/engine/behavior/detectors/recurringExpenseDetector";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { Transaction, RecipientProfile } from "@/features/finance/types";

const SUNDAYS = ["2026-07-05", "2026-07-12", "2026-07-19", "2026-07-26"];

function merchant(alias: string): TopMerchantEntry {
  return { alias, category: "Food", transactionCount: 4, totalAmount: 400, averagePurchase: 100, lastUsedDate: "2026-07-26", monthlyTrend: [] };
}

function profile(alias: string, recipientKey: string): RecipientProfile {
  return { recipientKey, alias, category: "Food", transactionCount: 4, totalAmount: 400, lastUsedDate: "2026-07-26", confidenceScore: 1 };
}

function context(topMerchants: TopMerchantEntry[], recipientProfiles: RecipientProfile[], transactions: Transaction[]): BehaviorEngineContext {
  return {
    transactions,
    budgets: [],
    recipientProfiles,
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants, subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now: new Date(2026, 6, 30),
  };
}

describe("detectRecurringExpenseHabits", () => {
  it("returns an empty array with no recurring merchant patterns", () => {
    expect(detectRecurringExpenseHabits(context([], [], []))).toEqual([]);
  });

  it("returns one neutral habit per merchant with a detected weekday cadence", () => {
    const transactions = SUNDAYS.map((d) => ({ title: "Test", amount: 100, type: "expense" as const, account: "Cash", date: d, recipient: "r1" }));
    const result = detectRecurringExpenseHabits(context([merchant("Tesco")], [profile("Tesco", "r1")], transactions));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("recurringExpense-Tesco");
    expect(result[0].polarity).toBe("neutral");
    expect(result[0].message.params.weekday).toBe(0);
  });
});
