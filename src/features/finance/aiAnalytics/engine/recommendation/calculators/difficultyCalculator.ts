// Difficulty — a lookup by RecommendationCategory: pure awareness/habit
// changes (Food/Restaurant/Coffee/Entertainment/Subscriptions) are Easy;
// structural changes (Shopping/Transport/Budget/Saving/CashFlow/Goals/
// General) are Moderate; changing income or investment allocation is Hard.
// "information"-priority recommendations (celebratory — nothing to do) are
// always Easy regardless of category.

import type { RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { Difficulty, ExpectedCompletionTime, RecommendationCategory } from "@/features/finance/aiAnalytics/engine/recommendation/types";

const DIFFICULTY_BY_CATEGORY: Record<RecommendationCategory, Difficulty> = {
  food: "easy",
  restaurant: "easy",
  coffee: "easy",
  entertainment: "easy",
  subscriptions: "easy",
  shopping: "moderate",
  transport: "moderate",
  budget: "moderate",
  saving: "moderate",
  cashFlow: "moderate",
  goals: "moderate",
  general: "moderate",
  income: "hard",
  investment: "hard",
};

export function calculateDifficulty(priority: RecommendationPriority, category: RecommendationCategory): Difficulty {
  if (priority === "information") return "easy";
  return DIFFICULTY_BY_CATEGORY[category];
}

// Directly derived from Difficulty — a deliberate simplification rather
// than a second, independent completion-time estimate (see types/index.ts).
const COMPLETION_TIME_BY_DIFFICULTY: Record<Difficulty, ExpectedCompletionTime> = {
  easy: "immediate",
  moderate: "thisMonth",
  hard: "within3Months",
};

export function expectedCompletionTimeFor(difficulty: Difficulty): ExpectedCompletionTime {
  return COMPLETION_TIME_BY_DIFFICULTY[difficulty];
}
