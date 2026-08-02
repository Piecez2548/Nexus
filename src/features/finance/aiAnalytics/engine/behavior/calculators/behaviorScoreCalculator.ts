// The 7-part Behavior Score — one file with per-sub-score private
// functions, mirroring healthScore.ts's own original structure (these 7
// are one cohesive result, not independently-weighted categories like
// Prompt 005's scoring system). Overall = the average of whichever
// sub-scores are computable, same "exclude, don't fabricate a 0"
// convention as healthScore.ts.

import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import { recentWindowExpense } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import { SHOPPING_CATEGORY_PATTERN } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
import { SHOPPING_CONCENTRATION_FULL_SCORE_PERCENT } from "@/features/finance/aiAnalytics/engine/behavior/calculators/spendingStyleClassifier";
import { shareScore } from "@/features/finance/aiAnalytics/engine/behavior/calculators/scoreMath";
import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import { coefficientOfVariationScore } from "@/features/finance/aiAnalytics/engine/shared/statsUtils";
import { BEHAVIOR_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BehaviorEngineContext, BehaviorScores } from "@/features/finance/aiAnalytics/engine/behavior/types";

const CONSISTENCY_WINDOW_MONTHS = 6;
const CONSISTENCY_MAX_COV = 0.6;
const DISCRETIONARY_KEYWORDS = [...BEHAVIOR_KEYWORDS.eatingOut, ...BEHAVIOR_KEYWORDS.coffee, ...BEHAVIOR_KEYWORDS.convenienceStore];

// BEHAVIOR_KEYWORDS.eatingOut matches literal restaurant-dining text
// ("restaurant", "dine", ...) — it deliberately does NOT match the bare
// word "food", since that flag is about dining out specifically, not a
// user's broader "Food" grocery category. Budget category *names* are a
// different matching problem (users typically name a budget "Food",
// "Coffee", "Shopping", etc.), so this is its own small pattern rather
// than reusing DISCRETIONARY_KEYWORDS for category-name matching too.
const DISCRETIONARY_CATEGORY_NAME_PATTERN = /food|restaurant|dining|dine|coffee|cafe|convenience/i;

function categoryNameIsDiscretionary(categoryName: string): boolean {
  return DISCRETIONARY_CATEGORY_NAME_PATTERN.test(categoryName) || SHOPPING_CATEGORY_PATTERN.test(categoryName);
}

function scoreShareInverse(amount: number, total: number, fullPenaltySharePercent: number): number | null {
  if (total <= 0) return null;
  return clamp(100 - shareScore(amount, total, fullPenaltySharePercent), 0, 100);
}

function scoreRestaurant(context: BehaviorEngineContext): number | null {
  const flag = context.behaviorAnalysis.flags.find((f) => f.key === "eatingOut");
  if (!flag || flag.transactionCount === 0) return null;
  return scoreShareInverse(flag.totalAmount, recentWindowExpense(context.cashFlowAnalysis), DEFAULT_SCORE_THRESHOLDS.behavior.discretionaryShareFullPenaltyPercent);
}

function scoreCoffee(context: BehaviorEngineContext): number | null {
  const flag = context.behaviorAnalysis.flags.find((f) => f.key === "coffee");
  if (!flag || flag.transactionCount === 0) return null;
  return scoreShareInverse(flag.totalAmount, recentWindowExpense(context.cashFlowAnalysis), DEFAULT_SCORE_THRESHOLDS.behavior.discretionaryShareFullPenaltyPercent);
}

function scoreShopping(context: BehaviorEngineContext): number | null {
  const shoppingCategory = context.spendingAnalysis.topCategories.find((c) => SHOPPING_CATEGORY_PATTERN.test(c.category));
  if (!shoppingCategory) return null;
  return clamp(100 - (shoppingCategory.percentOfTotal / SHOPPING_CONCENTRATION_FULL_SCORE_PERCENT) * 100, 0, 100);
}

function scoreImpulseControl(context: BehaviorEngineContext): number | null {
  const windowExpense = recentWindowExpense(context.cashFlowAnalysis);
  // No spending activity at all isn't "perfect impulse control" — that's
  // the same false-positive-from-emptiness trap Prompt 005's cashFlowScore
  // fix caught (an all-zero profile trivially "passing" every check). Zero
  // impulse purchases only counts as a clean 100 when there was real
  // expense activity to have been impulsive against.
  if (windowExpense <= 0) return null;

  const { impulsePurchases } = context.behaviorAnalysis;
  if (impulsePurchases.length === 0) return 100;
  const total = impulsePurchases.reduce((sum, p) => sum + p.amount, 0);
  return scoreShareInverse(total, windowExpense, DEFAULT_SCORE_THRESHOLDS.behavior.discretionaryShareFullPenaltyPercent);
}

// Behavior-relevant budget categories only (food/restaurant/coffee/
// shopping-named), not every budget in the profile — a whole-profile
// Budget Discipline score already exists (Prompt 005's own category
// score); this one is deliberately scoped to just the behavior domain.
function scoreBudgetDiscipline(context: BehaviorEngineContext): number | null {
  const relevant = context.budgetAnalysis.entries.filter((e) => categoryNameIsDiscretionary(e.budget.category));
  if (relevant.length === 0) return null;

  const okCount = relevant.filter((e) => e.status === "ok").length;
  const nearCount = relevant.filter((e) => e.status === "near").length;
  return ((okCount + 0.5 * nearCount) / relevant.length) * 100;
}

function monthlyDiscretionaryTotals(context: BehaviorEngineContext): number[] {
  const aliasByKey = recipientAliasLookup(context.recipientProfiles);
  return lastNMonthRanges(CONSISTENCY_WINDOW_MONTHS, context.now).map((m) =>
    context.transactions
      .filter((t) => t.type === "expense" && isDateWithinRange(t.date, m.range) && (matchesKeywordFlag(t, DISCRETIONARY_KEYWORDS, aliasByKey) || (t.category !== undefined && SHOPPING_CATEGORY_PATTERN.test(t.category))))
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

// Coefficient-of-variation on trailing discretionary spend — mirrors
// cashFlowScore.ts's (Prompt 005) own stability calculation, applied to a
// different (behavior-only) series. Delegates to the shared implementation
// in engine/shared/statsUtils.ts (verified identical guards/formula).
function scoreConsistency(context: BehaviorEngineContext): number | null {
  const values = monthlyDiscretionaryTotals(context);
  return coefficientOfVariationScore(values, CONSISTENCY_MAX_COV);
}

export function calculateBehaviorScores(context: BehaviorEngineContext): BehaviorScores {
  const restaurant = scoreRestaurant(context);
  const shopping = scoreShopping(context);
  const coffee = scoreCoffee(context);
  const budgetDiscipline = scoreBudgetDiscipline(context);
  const impulseControl = scoreImpulseControl(context);
  const consistency = scoreConsistency(context);

  const included = [restaurant, shopping, coffee, budgetDiscipline, impulseControl, consistency].filter((s): s is number => s !== null);
  const overall = included.length === 0 ? null : included.reduce((sum, s) => sum + s, 0) / included.length;

  return { overall, restaurant, shopping, coffee, budgetDiscipline, impulseControl, consistency };
}
