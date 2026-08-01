import { describe, expect, it } from "vitest";
import { enrichRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/generators/enrichRecommendation";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const now = new Date(2026, 6, 30);

function budgets(): BudgetAnalysisResult {
  return { entries: [], overCount: 0, nearCount: 0, okCount: 0 };
}

function cashFlow(income = 30000): CashFlowAnalysisResult {
  return { income, expense: 10000, saving: 20000, savingRatePercent: 66.7, netCashFlow: 20000, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] };
}

function context(overrides: Partial<Omit<RecommendationEngineContext, "recommendations">> = {}): Omit<RecommendationEngineContext, "recommendations"> {
  return {
    budgetAnalysis: budgets(),
    cashFlowAnalysis: cashFlow(),
    merchantAnalysis: [],
    financialHealthScore: { overallScore: 80, grade: "B+", status: "veryGood", insufficientData: false, categoryScores: [], strengths: [], weaknesses: [], warnings: [], recommendations: [], improvementOpportunities: [] },
    monthsOfHistory: 6,
    now,
    ...overrides,
  };
}

function restaurantRec(): Recommendation {
  return {
    id: "restaurant-visits-critical",
    key: "restaurantVisitsCritical",
    priority: "high",
    estimatedMonthlySavings: 1200,
    confidence: "high",
    estimatedImpact: 12,
    params: { count: 28 },
    title: { key: "aiAnalytics.recommendations.titles.restaurantVisitsCritical", params: {} },
    reason: { key: "aiAnalytics.recommendations.reasons.restaurantVisitsCritical", params: { count: 28 } },
    action: { key: "aiAnalytics.recommendations.actions.restaurantVisitsCritical", params: {} },
  };
}

describe("enrichRecommendation", () => {
  it("carries id/priority/estimatedMonthlySavings through unchanged", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.id).toBe("restaurant-visits-critical");
    expect(result.priority).toBe("high");
    expect(result.estimatedMonthlySavings).toBe(1200);
    expect(result.estimatedAnnualSavings).toBe(14400);
  });

  it("categorizes via categoryCalculator", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.category).toBe("restaurant");
  });

  it("reuses title/reason/action as title/summary+reason/description, unresolved", () => {
    const rec = restaurantRec();
    const result = enrichRecommendation(rec, context());
    expect(result.title).toEqual(rec.title);
    expect(result.summary).toEqual(rec.reason);
    expect(result.reason).toEqual(rec.reason);
    expect(result.description).toEqual(rec.action);
  });

  it("exposes params as supportingMetrics verbatim when the rule isn't merchant-tied", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.supportingMetrics).toEqual({ count: 28 });
  });

  it("enriches supportingMetrics with real MerchantAnalysis figures for a merchant-tied rule", () => {
    const rec: Recommendation = { ...restaurantRec(), key: "merchantDependency", params: { merchant: "7-Eleven", percent: 40 } };
    const merchantAnalysis: MerchantAnalysis[] = [
      { alias: "7-Eleven", frequency: 10, totalSpending: 5000, averagePurchase: 500, largestPurchase: null, monthlyGrowthPercent: 12.4, categories: ["Food"], recommendations: [] },
    ];
    const result = enrichRecommendation(rec, context({ merchantAnalysis }));
    expect(result.supportingMetrics).toEqual({ merchant: "7-Eleven", percent: 40, merchantTotalSpending: 5000, merchantMonthlyGrowthPercent: 12 });
  });

  it("does not enrich supportingMetrics when no matching merchant is found", () => {
    const rec: Recommendation = { ...restaurantRec(), key: "merchantDependency", params: { merchant: "Unknown Shop" } };
    const result = enrichRecommendation(rec, context({ merchantAnalysis: [] }));
    expect(result.supportingMetrics).toEqual({ merchant: "Unknown Shop" });
  });

  it("traces back to exactly the originating rule key", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.relatedRules).toEqual(["restaurantVisitsCritical"]);
  });

  it("stamps createdTime as the batch now, as an ISO string", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.createdTime).toBe(now.toISOString());
  });

  it("derives difficulty and expectedCompletionTime consistently", () => {
    const result = enrichRecommendation(restaurantRec(), context());
    expect(result.difficulty).toBe("easy"); // restaurant category
    expect(result.expectedCompletionTime).toBe("immediate");
  });

  it("builds suggestedActions with immediate reusing the rule's action", () => {
    const rec = restaurantRec();
    const result = enrichRecommendation(rec, context());
    expect(result.suggestedActions.immediate).toEqual(rec.action);
    expect(result.suggestedActions.weekly.key).toContain("restaurant");
  });

  it("computes a numeric 0-100 confidence, penalized when the overall profile is data-insufficient", () => {
    const withData = enrichRecommendation(restaurantRec(), context());
    const insufficientData = enrichRecommendation(restaurantRec(), context({ financialHealthScore: { ...context().financialHealthScore, insufficientData: true } }));
    expect(withData.confidence).toBeGreaterThanOrEqual(0);
    expect(withData.confidence).toBeLessThanOrEqual(100);
    expect(insufficientData.confidence).toBeLessThan(withData.confidence);
  });
});
