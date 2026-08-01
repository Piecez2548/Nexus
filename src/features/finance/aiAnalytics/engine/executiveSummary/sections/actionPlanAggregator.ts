// Aggregates the top recommendations' suggestedActions into one
// {immediate, weekly, monthly, longTerm}, deduped by message key. weekly/
// monthly/longTerm come from a category-level (not per-rule) template
// (suggestedActionsTemplate.ts), so two top recommendations sharing a
// category produce byte-identical messages — deduping avoids showing the
// same action twice.

import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { RecommendationMessage } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { ActionPlan } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

function dedupeByKey(messages: RecommendationMessage[]): RecommendationMessage[] {
  const seen = new Set<string>();
  const result: RecommendationMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.key)) continue;
    seen.add(message.key);
    result.push(message);
  }
  return result;
}

export function buildActionPlan(recommendations: ActionableRecommendation[]): ActionPlan {
  return {
    immediate: dedupeByKey(recommendations.map((r) => r.suggestedActions.immediate)),
    weekly: dedupeByKey(recommendations.map((r) => r.suggestedActions.weekly)),
    monthly: dedupeByKey(recommendations.map((r) => r.suggestedActions.monthly)),
    longTerm: dedupeByKey(recommendations.map((r) => r.suggestedActions.longTerm)),
  };
}
