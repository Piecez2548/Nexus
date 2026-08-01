import { describe, expect, it } from "vitest";
import { respondBehaviorAnalysis } from "./behaviorAnalysisResponder";
import type { FinancialAnalysisResult } from "@/features/finance/aiAnalytics/types";
import type { BehaviorAnalysisEngineResult, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

function habit(id: string, message: DetectedHabit["message"]): DetectedHabit {
  return { id, polarity: "negative", confidence: 70, message, supportingMetrics: {} };
}

function behaviorProfile(overrides: Partial<BehaviorAnalysisEngineResult> = {}): BehaviorAnalysisEngineResult {
  return {
    profile: {} as BehaviorAnalysisEngineResult["profile"],
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

describe("respondBehaviorAnalysis", () => {
  it("leads with the top negative habit's own message when one exists", () => {
    const negativeHabits = [habit("late-night", { key: "aiAnalytics.behaviorProfile.detectors.lateNight.negative", params: {} })];
    const data = { behaviorProfile: behaviorProfile({ detectedHabits: negativeHabits, negativeHabits }) } as unknown as FinancialAnalysisResult;
    const result = respondBehaviorAnalysis(data);
    expect(result.answer.key).toContain("hasData");
    expect(result.reason.key).toBe("aiAnalytics.behaviorProfile.detectors.lateNight.negative");
  });

  it("falls back to the top positive habit when there's no negative one", () => {
    const positiveHabits = [habit("good-saver", { key: "aiAnalytics.behaviorProfile.detectors.savings.positive", params: {} })];
    const data = { behaviorProfile: behaviorProfile({ detectedHabits: positiveHabits, positiveHabits }) } as unknown as FinancialAnalysisResult;
    const result = respondBehaviorAnalysis(data);
    expect(result.reason.key).toBe("aiAnalytics.behaviorProfile.detectors.savings.positive");
  });

  it("reuses behaviorProfile.confidence directly rather than recomputing", () => {
    const data = { behaviorProfile: behaviorProfile({ confidence: 82 }) } as unknown as FinancialAnalysisResult;
    const result = respondBehaviorAnalysis(data);
    expect(result.confidence).toBe(82);
  });

  it("never fabricates a habit when none were detected", () => {
    const data = { behaviorProfile: behaviorProfile() } as unknown as FinancialAnalysisResult;
    const result = respondBehaviorAnalysis(data);
    expect(result.answer.key).toContain("noData");
    expect(result.reason.key).toContain("reasonNoData");
  });

  it("reuses behaviorProfile's own filtered recommendations verbatim", () => {
    const recommendations = [
      {
        id: "r1",
        priority: "medium" as const,
        category: "food" as const,
        title: { key: "t", params: {} },
        summary: { key: "s", params: {} },
        description: { key: "d", params: {} },
        reason: { key: "r", params: {} },
        supportingMetrics: {},
        confidence: 60,
        estimatedMonthlySavings: 100,
        estimatedAnnualSavings: 1200,
        estimatedFinancialImpact: { monthlySavings: 100, annualSavings: 1200, budgetImprovementPercent: null, savingRateImprovementPercent: null },
        difficulty: "easy" as const,
        expectedCompletionTime: "immediate" as const,
        suggestedActions: { immediate: { key: "i", params: {} }, weekly: { key: "w", params: {} }, monthly: { key: "m", params: {} }, longTerm: { key: "l", params: {} } },
        relatedRules: ["someRule"],
        createdTime: "2026-07-01T00:00:00.000Z",
      },
    ];
    const data = { behaviorProfile: behaviorProfile({ recommendations }) } as unknown as FinancialAnalysisResult;
    const result = respondBehaviorAnalysis(data);
    expect(result.relatedRecommendations).toEqual(recommendations);
  });
});
