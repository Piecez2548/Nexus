// Classifies the user into the 9 spec archetypes, each score grounded in a
// real, already-computed signal — never a single unexplained label. The
// primary style is the archetype with the top score; confidence reflects
// how clearly it leads the runner-up (a close tie is genuinely ambiguous,
// not a confident classification), not how strongly the style itself
// applies (that's what the score is for).

import { recentWindowExpense } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import { SHOPPING_CATEGORY_PATTERN } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/shoppingAnalyzer";
import { clamp, shareScore } from "@/features/finance/aiAnalytics/engine/behavior/calculators/scoreMath";
import { DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { BehaviorEngineContext, SpendingStyle, SpendingStyleClassification } from "@/features/finance/aiAnalytics/engine/behavior/types";

const ALL_STYLES: SpendingStyle[] = [
  "budgetConscious",
  "impulseSpender",
  "restaurantLover",
  "coffeeEnthusiast",
  "shoppingEnthusiast",
  "disciplinedSaver",
  "balancedSpender",
  "growingSaver",
  "highRiskSpender",
];

// Exported so behaviorScoreCalculator.ts's inverse "Shopping" score uses
// the exact same concentration threshold, not a second copy of the number.
export const SHOPPING_CONCENTRATION_FULL_SCORE_PERCENT = 25;

function categoryScore(context: BehaviorEngineContext, category: string): number {
  return context.financialHealthScore.categoryScores.find((c) => c.category === category)?.score ?? 0;
}

export function classifySpendingStyle(context: BehaviorEngineContext): SpendingStyleClassification {
  // No fabricated guess when the profile itself is data-insufficient —
  // matches this engine's insufficientData convention everywhere else.
  if (context.financialHealthScore.insufficientData) {
    const scores = Object.fromEntries(ALL_STYLES.map((style) => [style, 0])) as Record<SpendingStyle, number>;
    return { primaryStyle: null, confidence: 0, scores };
  }

  const windowExpense = recentWindowExpense(context.cashFlowAnalysis);
  const eatingOut = context.behaviorAnalysis.flags.find((f) => f.key === "eatingOut");
  const coffee = context.behaviorAnalysis.flags.find((f) => f.key === "coffee");
  const shoppingCategory = context.spendingAnalysis.topCategories.find((c) => SHOPPING_CATEGORY_PATTERN.test(c.category));
  const impulseTotal = context.behaviorAnalysis.impulsePurchases.reduce((sum, p) => sum + p.amount, 0);
  const discretionaryFullShare = DEFAULT_SCORE_THRESHOLDS.behavior.discretionaryShareFullPenaltyPercent;

  const restaurantLover = shareScore(eatingOut?.totalAmount ?? 0, windowExpense, discretionaryFullShare);
  const coffeeEnthusiast = shareScore(coffee?.totalAmount ?? 0, windowExpense, discretionaryFullShare);
  const shoppingEnthusiast = shoppingCategory ? clamp((shoppingCategory.percentOfTotal / SHOPPING_CONCENTRATION_FULL_SCORE_PERCENT) * 100, 0, 100) : 0;
  const impulseSpender = shareScore(impulseTotal, windowExpense, discretionaryFullShare);
  // Reuses Prompt 005's own budgetDiscipline/savingRate category scores
  // directly — this engine never recomputes what that one already did.
  const budgetConscious = categoryScore(context, "budgetDiscipline");
  const disciplinedSaver = categoryScore(context, "savingRate");

  const savingChange = context.cashFlowAnalysis.changeVsPreviousMonth.saving;
  const growingSaver = savingChange !== null && savingChange > 0 ? clamp(50 + savingChange, 0, 100) : 20;

  // The steadier, less-extreme a profile is across every discretionary
  // signal, the higher this scores — the inverse of whichever single style
  // dominates most.
  const balancedSpender = clamp(100 - Math.max(restaurantLover, coffeeEnthusiast, shoppingEnthusiast, impulseSpender), 0, 100);

  const { savingRatePercent, netCashFlow } = context.cashFlowAnalysis;
  const highRiskSpender = clamp(
    (netCashFlow < 0 ? 50 : 0) + impulseSpender / 2 + (savingRatePercent !== null && savingRatePercent < 0 ? 30 : 0),
    0,
    100
  );

  const scores: Record<SpendingStyle, number> = {
    budgetConscious,
    impulseSpender,
    restaurantLover,
    coffeeEnthusiast,
    shoppingEnthusiast,
    disciplinedSaver,
    balancedSpender,
    growingSaver,
    highRiskSpender,
  };

  const ranked = (Object.entries(scores) as [SpendingStyle, number][]).sort((a, b) => b[1] - a[1]);
  const [primaryStyle, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const confidence = clamp(Math.round(50 + (topScore - secondScore)), 0, 100);

  return { primaryStyle, confidence, scores };
}
