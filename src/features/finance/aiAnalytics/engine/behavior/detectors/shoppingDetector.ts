// No dedicated "shopping" flag exists in behaviorAnalysis.ts (unlike
// eatingOut/coffee/convenienceStore) — this reads spendingAnalysis.topCategories
// instead, matching a shopping-ish category name via the same
// SHOPPING_CATEGORY_PATTERN analyzers/shoppingAnalyzer.ts uses.

import { SHOPPING_CATEGORY_PATTERN } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
import type { BehaviorEngineContext, DetectedHabit, HabitPolarity } from "@/features/finance/aiAnalytics/engine/behavior/types";

const HIGH_CONCENTRATION_PERCENT = 25;
// No transaction-count proxy exists on TopCategoryEntry (only
// category/amount/percentOfTotal) — a flat medium confidence, same
// convention rules/shared.ts documents for rules with no natural
// sample-size signal to key off of.
const FLAT_CONFIDENCE = 55;

export function detectShoppingHabit(context: BehaviorEngineContext): DetectedHabit | null {
  const shoppingCategory = context.spendingAnalysis.topCategories.find((c) => SHOPPING_CATEGORY_PATTERN.test(c.category));
  if (!shoppingCategory) return null;

  const polarity: HabitPolarity = shoppingCategory.percentOfTotal >= HIGH_CONCENTRATION_PERCENT ? "negative" : "neutral";
  const params = { category: shoppingCategory.category, amount: Math.round(shoppingCategory.amount), percent: Math.round(shoppingCategory.percentOfTotal) };

  return {
    id: "shopping",
    polarity,
    confidence: FLAT_CONFIDENCE,
    message: { key: `aiAnalytics.behaviorProfile.detectors.shopping.${polarity}`, params },
    supportingMetrics: params,
  };
}
