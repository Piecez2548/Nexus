// Transforms one Rule Engine finding into a richer ActionableRecommendation
// — combines every calculator/template in this module. Despite living
// under generators/ (matching the spec's suggested folder name), this is
// deliberately an enrichment of an existing finding, not a from-scratch
// detector — see the plan's design-decision writeup for why.
//
// title/summary/description/reason field mapping (reuse before inventing,
// zero new i18n for these four fields):
// - title reuses the rule's own `title` message, unchanged.
// - summary and reason both reuse the rule's own `reason` message — this
//   codebase's `reason` copy already reads as a compact factual summary
//   (e.g. "You visited restaurants 28 times this month"), so both fields
//   point at the same real content rather than one being fabricated.
// - description reuses the rule's own `action` message — "what to do
//   about it" is itself a natural fuller description of the recommendation.

import { calculateCategory } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/categoryCalculator";
import { calculateConfidence } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/confidenceCalculator";
import { estimateAnnualSavings } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/savingsEstimator";
import { calculateImpact } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/impactCalculator";
import { calculateDifficulty, expectedCompletionTimeFor } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/difficultyCalculator";
import { buildSuggestedActions } from "@/features/finance/aiAnalytics/engine/recommendation/templates/suggestedActionsTemplate";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { ActionableRecommendation, RecommendationEngineContext } from "@/features/finance/aiAnalytics/engine/recommendation/types";

// Merchant-tied recommendations (merchantDependency, fastestGrowingMerchant
// — both set params.merchant to the merchant's alias) get their
// supportingMetrics enriched with real figures from MerchantAnalysis
// (Prompt 004) that the originating rule itself doesn't carry, like total
// spending and month-over-month growth. A no-op for every other rule.
function withMerchantMetrics(rec: Recommendation, merchantAnalysis: RecommendationEngineContext["merchantAnalysis"]): Record<string, string | number> {
  const alias = typeof rec.params.merchant === "string" ? rec.params.merchant : null;
  if (!alias) return rec.params;

  const match = merchantAnalysis.find((m) => m.alias === alias);
  if (!match) return rec.params;

  return {
    ...rec.params,
    merchantTotalSpending: match.totalSpending,
    ...(match.monthlyGrowthPercent !== null ? { merchantMonthlyGrowthPercent: Math.round(match.monthlyGrowthPercent) } : {}),
  };
}

export function enrichRecommendation(rec: Recommendation, context: Omit<RecommendationEngineContext, "recommendations">): ActionableRecommendation {
  const { budgetAnalysis, cashFlowAnalysis, merchantAnalysis, financialHealthScore, monthsOfHistory, now } = context;

  const category = calculateCategory(rec);
  const difficulty = calculateDifficulty(rec.priority, category);

  return {
    id: rec.id,
    priority: rec.priority,
    category,
    title: rec.title,
    summary: rec.reason,
    description: rec.action,
    reason: rec.reason,
    supportingMetrics: withMerchantMetrics(rec, merchantAnalysis),
    confidence: calculateConfidence(rec, monthsOfHistory, financialHealthScore.insufficientData),
    estimatedMonthlySavings: rec.estimatedMonthlySavings,
    estimatedAnnualSavings: estimateAnnualSavings(rec.estimatedMonthlySavings),
    estimatedFinancialImpact: calculateImpact(rec, budgetAnalysis, cashFlowAnalysis),
    difficulty,
    expectedCompletionTime: expectedCompletionTimeFor(difficulty),
    suggestedActions: buildSuggestedActions(rec, category),
    relatedRules: [rec.key],
    createdTime: now.toISOString(),
  };
}
