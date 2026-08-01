import type { Recommendation, RecommendationPriority, RecommendationConfidence } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

// What a rule's evaluate() actually returns — estimatedImpact is filled in
// once, centrally, by the registry (see withEstimatedImpact) since it needs
// this month's total expense, a figure no single rule should have to thread
// through itself.
export type RecommendationDraft = Omit<Recommendation, "estimatedImpact">;

const HIGH_SAVINGS_THRESHOLD = 1000;
const MEDIUM_SAVINGS_THRESHOLD = 300;

// Priority driven purely by estimated-savings magnitude — simple,
// explainable, and consistent for every savings-magnitude-driven rule.
// Severity-driven rules (a hard fact, a critical multi-month pattern) set
// their own priority explicitly instead of calling this.
export function priorityForSavings(amount: number): RecommendationPriority {
  if (amount >= HIGH_SAVINGS_THRESHOLD) return "high";
  if (amount >= MEDIUM_SAVINGS_THRESHOLD) return "medium";
  return "low";
}

const HIGH_CONFIDENCE_MIN_SAMPLES = 10;
const MEDIUM_CONFIDENCE_MIN_SAMPLES = 3;

// For rules backed by a transaction count (more occurrences = a more
// trustworthy pattern, not a one-off coincidence). Rules with no natural
// sample-size proxy use a flat confidence instead.
export function confidenceForSampleSize(count: number): RecommendationConfidence {
  if (count >= HIGH_CONFIDENCE_MIN_SAMPLES) return "high";
  if (count >= MEDIUM_CONFIDENCE_MIN_SAMPLES) return "medium";
  return "low";
}

// Builds title/reason/action as {key, params} pairs off one rule key —
// covers every rule whose title text doesn't itself vary by which branch
// fired (the only current exception, reduceBehaviorSpending, builds its
// title key inline since it depends on which behavior flag matched).
export function ruleMessages(
  key: string,
  titleParams: Record<string, string | number>,
  reasonParams: Record<string, string | number>,
  actionParams: Record<string, string | number> = {}
): Pick<Recommendation, "title" | "reason" | "action"> {
  return {
    title: { key: `aiAnalytics.recommendations.titles.${key}`, params: titleParams },
    reason: { key: `aiAnalytics.recommendations.reasons.${key}`, params: reasonParams },
    action: { key: `aiAnalytics.recommendations.actions.${key}`, params: actionParams },
  };
}

// The one and only place estimatedImpact is computed — every rule's draft
// flows through here once, in the registry, instead of each rule repeating
// the same "% of this month's expense" formula.
export function withEstimatedImpact(drafts: RecommendationDraft[], monthlyExpense: number): Recommendation[] {
  return drafts.map((r) => ({
    ...r,
    estimatedImpact: monthlyExpense > 0 ? Math.round((r.estimatedMonthlySavings / monthlyExpense) * 100) : null,
  }));
}
