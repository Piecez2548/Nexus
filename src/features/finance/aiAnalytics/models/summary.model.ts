// Summary — reshapes the existing flat executiveSummary.ts output
// (ExecutiveSummaryPart[]) into the spec's headline/highlights/
// opportunities/risks/nextActions buckets. Built entirely from
// Recommendation[] (not AiInsight[]): every Recommendation message is
// already a fully-resolved {key, params} pair ready for t(key, params) —
// AiInsight's key needs render-time special-casing for some keys (see
// AiInsightsPanel.tsx's spendingTrend/savingsTrend "Up"/"Down" suffix
// logic), which would have to be duplicated here to build a genuinely
// resolvable key. Sourcing every bucket from Recommendation avoids that
// duplication and needs zero new translation keys.

import type { Recommendation, RecommendationMessage } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

export interface Summary {
  readonly headline: RecommendationMessage | null;
  readonly positiveHighlights: readonly RecommendationMessage[];
  readonly negativeHighlights: readonly RecommendationMessage[];
  readonly opportunities: readonly RecommendationMessage[];
  readonly risks: readonly RecommendationMessage[];
  readonly nextActions: readonly RecommendationMessage[];
}

const TOP_N = 3;

export function buildSummary(recommendations: Recommendation[]): Summary {
  // registry.ts already sorts recommendations by priority tier then
  // estimatedMonthlySavings descending — [0] is the single most important
  // finding this run produced, good or bad.
  const headline = recommendations[0]?.title ?? null;

  const positiveHighlights = recommendations.filter((r) => r.priority === "information").map((r) => r.reason);
  const negativeHighlights = recommendations.filter((r) => r.priority === "critical" || r.priority === "high").map((r) => r.title);
  const opportunities = recommendations
    .filter((r) => r.estimatedMonthlySavings > 0)
    .slice(0, TOP_N)
    .map((r) => r.action);
  // The 3 forecast/*.rule.ts rules are the only forward-looking (as opposed
  // to already-happened) findings the engine produces — a natural "risk"
  // bucket without inventing a new classification.
  const risks = recommendations.filter((r) => r.key.startsWith("forecast")).map((r) => r.title);
  const nextActions = recommendations.slice(0, TOP_N).map((r) => r.action);

  return { headline, positiveHighlights, negativeHighlights, opportunities, risks, nextActions };
}
