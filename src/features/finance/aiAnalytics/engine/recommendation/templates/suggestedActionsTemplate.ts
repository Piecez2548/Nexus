// SuggestedActions — "immediate" reuses the rule's own `action` message
// (zero new content); weekly/monthly/longTerm come from a category-level
// (not per-rule) template, since writing a distinct 3-horizon action set
// for each of the ~46 rules would be a lot of near-duplicate i18n content
// for little practical difference within a category.

import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { RecommendationCategory, SuggestedActions } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const NS = "aiAnalytics.actionableRecommendations.suggestedActions";

export function buildSuggestedActions(rec: Recommendation, category: RecommendationCategory): SuggestedActions {
  return {
    immediate: rec.action,
    weekly: { key: `${NS}.${category}.weekly`, params: {} },
    monthly: { key: `${NS}.${category}.monthly`, params: {} },
    longTerm: { key: `${NS}.${category}.longTerm`, params: {} },
  };
}
