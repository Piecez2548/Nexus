import { describe, expect, it } from "vitest";
import { classifySpendingStyle } from "@/features/finance/aiAnalytics/engine/behavior/calculators/spendingStyleClassifier";
import type { BehaviorEngineContext } from "@/features/finance/aiAnalytics/engine/behavior/types";
import type { CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

const now = new Date(2026, 6, 30);

function categoryScore(category: CategoryScoreResult["category"], score: number | null): CategoryScoreResult {
  return { category, score, weight: 10, explanation: { reason: { key: "r", params: {} }, positiveFactors: [], negativeFactors: [], improvementSuggestions: [] } };
}

function context(overrides: Partial<BehaviorEngineContext> = {}): BehaviorEngineContext {
  return {
    transactions: [],
    budgets: [],
    recipientProfiles: [],
    behaviorAnalysis: { flags: [], largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null },
    spendingAnalysis: { topCategories: [], categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null },
    cashFlowAnalysis: { income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [{ monthKey: "x", income: 30000, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000 }] },
    budgetAnalysis: { entries: [], overCount: 0, nearCount: 0, okCount: 0 },
    merchantAnalysis: [],
    recommendations: [],
    actionableRecommendations: [],
    financialHealthScore: { overallScore: 80, grade: "B+", status: "veryGood", insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    timeline: [],
    now,
    ...overrides,
  };
}

describe("classifySpendingStyle", () => {
  it("classifies nothing when the overall profile is data-insufficient", () => {
    const result = classifySpendingStyle(context({ financialHealthScore: { overallScore: null, grade: null, status: null, insufficientData: true, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] } }));
    expect(result.primaryStyle).toBeNull();
    expect(result.confidence).toBe(0);
    expect(Object.values(result.scores).every((s) => s === 0)).toBe(true);
  });

  it("classifies a restaurant-heavy profile as restaurantLover", () => {
    const flags: BehaviorFlag[] = [{ key: "eatingOut", transactionCount: 20, totalAmount: 9000, dataQuality: "full" }];
    const result = classifySpendingStyle(context({ behaviorAnalysis: { flags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));
    expect(result.primaryStyle).toBe("restaurantLover");
  });

  it("classifies a profile with a strong budgetDiscipline score as budgetConscious", () => {
    const result = classifySpendingStyle(
      context({ financialHealthScore: { overallScore: 90, grade: "A", status: "outstanding", insufficientData: false, categoryScores: [categoryScore("budgetDiscipline", 100)], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] } })
    );
    expect(result.primaryStyle).toBe("budgetConscious");
  });

  it("has a full breakdown covering all 9 archetypes", () => {
    const result = classifySpendingStyle(context());
    expect(Object.keys(result.scores)).toHaveLength(9);
  });

  it("has higher confidence when the top style clearly leads the runner-up than when two styles are close", () => {
    // windowExpense is 10000 in the default fixture — 2000 is a clean 20%
    // share (below flagBasedDetector's 100-score-clamp ceiling).
    const dominantFlags: BehaviorFlag[] = [{ key: "eatingOut", transactionCount: 20, totalAmount: 2000, dataQuality: "full" }];
    const dominant = classifySpendingStyle(context({ behaviorAnalysis: { flags: dominantFlags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));

    // Two discretionary signals tied at an equal 15% share each — genuinely
    // ambiguous which archetype fits best.
    const closeFlags: BehaviorFlag[] = [
      { key: "eatingOut", transactionCount: 10, totalAmount: 1500, dataQuality: "full" },
      { key: "coffee", transactionCount: 10, totalAmount: 1500, dataQuality: "full" },
    ];
    const close = classifySpendingStyle(context({ behaviorAnalysis: { flags: closeFlags, largePurchases: [], topMerchants: [], subscriptions: [], impulsePurchases: [], mostActiveHour: { hour: null, dataQuality: "unavailable" }, mostActiveWeekday: null } }));

    expect(dominant.confidence).toBeGreaterThan(close.confidence);
  });
});
