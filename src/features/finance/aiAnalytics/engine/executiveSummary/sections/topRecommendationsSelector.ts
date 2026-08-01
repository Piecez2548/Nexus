// context.actionableRecommendations is already prioritizeRecommendations()'s
// output (priority tier -> savings -> confidence -> difficulty) — a plain
// slice, no re-sort.

import type { ActionableRecommendation } from "@/features/finance/aiAnalytics/engine/recommendation/types";

export const MAX_TOP_RECOMMENDATIONS = 5;

export function selectTopRecommendations(actionableRecommendations: ActionableRecommendation[]): ActionableRecommendation[] {
  return actionableRecommendations.slice(0, MAX_TOP_RECOMMENDATIONS);
}
