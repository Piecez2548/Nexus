import { describe, expect, it } from "vitest";
import { buildBehaviorSummary } from "./behaviorSummaryBuilder";
import type { BehaviorAnalysisEngineResult, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

function habit(id: string, confidence: number, polarity: DetectedHabit["polarity"] = "positive"): DetectedHabit {
  return { id, polarity, confidence, message: { key: `k.${id}`, params: {} }, supportingMetrics: {} };
}

function behaviorProfile(overrides: Partial<BehaviorAnalysisEngineResult> = {}): BehaviorAnalysisEngineResult {
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
    ...overrides,
  };
}

describe("buildBehaviorSummary", () => {
  it("passes spendingStyle, insights, and confidence through verbatim", () => {
    const insights = [{ key: "aiAnalytics.behaviorProfile.insights.weekendConsistentlyHigher", params: {} }];
    const profile = behaviorProfile({ insights, confidence: 72 });
    const result = buildBehaviorSummary(profile);
    expect(result.insights).toBe(insights);
    expect(result.confidence).toBe(72);
    expect(result.spendingStyle).toBe(profile.profile.spendingStyle);
  });

  it("caps positive/negative habits to the top 3 by confidence", () => {
    const positiveHabits = [habit("p1", 40), habit("p2", 90), habit("p3", 60), habit("p4", 70)];
    const negativeHabits = [habit("n1", 20, "negative"), habit("n2", 80, "negative")];
    const result = buildBehaviorSummary(behaviorProfile({ positiveHabits, negativeHabits }));

    expect(result.topPositiveHabits).toHaveLength(3);
    expect(result.topPositiveHabits.map((h) => h.id)).toEqual(["p2", "p4", "p3"]);
    expect(result.topNegativeHabits.map((h) => h.id)).toEqual(["n2", "n1"]);
  });

  it("returns empty habit lists when there are none", () => {
    const result = buildBehaviorSummary(behaviorProfile());
    expect(result.topPositiveHabits).toEqual([]);
    expect(result.topNegativeHabits).toEqual([]);
  });
});
