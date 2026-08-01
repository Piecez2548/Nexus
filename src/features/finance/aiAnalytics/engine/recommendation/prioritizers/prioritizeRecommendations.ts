// Sorts ActionableRecommendations by the spec's own ordering — Financial
// Risk / Urgency (priority tier), Potential Savings, Confidence, then
// Difficulty as the final tie-break (easier wins). Extends, rather than
// reimplements, the existing engine/rules/registry.ts sort (priority tier
// then savings descending) by adding confidence/difficulty as further
// tie-breakers — "Impact" is already correlated with savings/priority, not
// a separate independent sort key.

import type { ActionableRecommendation, Difficulty } from "@/features/finance/aiAnalytics/engine/recommendation/types";
import type { RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3, information: 4 };
const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, moderate: 1, hard: 2 };

export function prioritizeRecommendations(recommendations: ActionableRecommendation[]): ActionableRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const savingsDiff = b.estimatedMonthlySavings - a.estimatedMonthlySavings;
    if (savingsDiff !== 0) return savingsDiff;

    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;

    return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
  });
}
