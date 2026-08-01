// Maps a Rule Engine finding onto the Recommendation Engine's finer
// 14-value taxonomy. Two passes:
// 1. If the rule carries a real user-facing category name in
//    params.category (reduceOverBudgetCategory, budgetNear90,
//    repeatedBudgetOverflow, underutilizedBudget, reduceCategoryOverspend —
//    the "any category" generic budget/expense rules), match it against a
//    keyword table. This is what lets a user's own "Entertainment"-named
//    category correctly land in the Entertainment bucket, even though no
//    dedicated Entertainment rule exists.
// 2. Otherwise, a static rule.key -> category table. Rules with no natural
//    specific bucket (expenseRatioHigh, merchantDependency,
//    lateNightSpending, ...) fall back to "general". "investment" is never
//    produced — Portfolio/Trading are separate modules with no data
//    sharing into this engine (same limitation documented in Prompt 003).

import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { RecommendationCategory } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const CATEGORY_NAME_KEYWORDS: [RegExp, RecommendationCategory][] = [
  [/food|grocery|groceries/i, "food"],
  [/restaurant|dining|dine/i, "restaurant"],
  [/coffee|cafe/i, "coffee"],
  [/shopping|retail/i, "shopping"],
  [/transport|taxi|grab|fuel|gas|vehicle/i, "transport"],
  [/entertainment|movie|game|streaming/i, "entertainment"],
  [/subscription/i, "subscriptions"],
];

function categoryFromName(name: string): RecommendationCategory | null {
  for (const [pattern, category] of CATEGORY_NAME_KEYWORDS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

const RULE_CATEGORY_FALLBACK: Record<string, RecommendationCategory> = {
  // budget
  reduceOverBudgetCategory: "budget",
  budgetNear90: "budget",
  repeatedBudgetOverflow: "budget",
  underutilizedBudget: "budget",
  budgetRespected: "budget",
  excellentBudgetDiscipline: "budget",
  forecastBudgetOverflow: "budget",
  reduceCategoryOverspend: "budget",
  // cash flow
  negativeCashFlow: "cashFlow",
  repeatedNegativeCashFlow: "cashFlow",
  expenseSpike: "cashFlow",
  forecastNegativeCashFlow: "cashFlow",
  // saving
  savingRateCritical: "saving",
  increaseSavingRate: "saving",
  savingRateImproving: "saving",
  consistentSaving: "saving",
  forecastSavingsDecline: "saving",
  // income
  incomeGrowthNegative: "income",
  incomeIncreasing: "income",
  // coffee
  coffeeAboveMonthlyAverage: "coffee",
  reduceCoffeeVisits: "coffee",
  // food
  foodIncreasingTrend: "food",
  foodShareCritical: "food",
  // restaurant
  reduceRestaurantVisits: "restaurant",
  restaurantVisitsCritical: "restaurant",
  averageMealCostIncreasing: "restaurant",
  // shopping
  impulsePurchases: "shopping",
  shoppingGrowthHigh: "shopping",
  weekendShopping: "shopping",
  // subscriptions
  manySubscriptions: "subscriptions",
  subscriptionPriceIncrease: "subscriptions",
  // transport
  rideHailingDependency: "transport",
  transportAboveAverage: "transport",
  // goals
  goalAcceleration: "goals",
  goalBehindSchedule: "goals",
  goalCompleted: "goals",
  goalNearlyComplete: "goals",
};

export function calculateCategory(rec: Recommendation): RecommendationCategory {
  // Only fires for the "convenienceStore" flag today (see
  // rules/behavior/reduceBehaviorSpending.rule.ts) — a convenience-store
  // run is shopping, not a generic behavior pattern.
  if (rec.key === "reduceBehaviorSpending" && rec.params.behavior === "convenienceStore") return "shopping";

  const categoryParam = rec.params.category;
  if (typeof categoryParam === "string") {
    const fromName = categoryFromName(categoryParam);
    if (fromName) return fromName;
  }

  return RULE_CATEGORY_FALLBACK[rec.key] ?? "general";
}
