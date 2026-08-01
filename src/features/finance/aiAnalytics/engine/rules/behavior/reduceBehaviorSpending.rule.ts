import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { priorityForSavings, confidenceForSampleSize, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import type { BehaviorFlagKey } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

// Only convenienceStore keeps an unconditional trigger here — eatingOut and
// coffee have their own threshold-gated rules (see rules/food/) so the same
// underlying signal isn't recommended twice.
const REDUCIBLE_BEHAVIOR_FLAGS: BehaviorFlagKey[] = ["convenienceStore"];
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const flag of context.behaviorAnalysis.flags) {
    if (!REDUCIBLE_BEHAVIOR_FLAGS.includes(flag.key) || flag.totalAmount <= 0) continue;

    const estimatedMonthlySavings = Math.round(flag.totalAmount * REDUCTION_ASSUMPTION);
    recommendations.push({
      id: `reduce-behavior-${flag.key}`,
      key: "reduceBehaviorSpending",
      priority: priorityForSavings(estimatedMonthlySavings),
      estimatedMonthlySavings,
      confidence: confidenceForSampleSize(flag.transactionCount),
      params: { behavior: flag.key },
      // Title varies by which behavior flag matched — a separate lookup
      // namespace per flag, not the shared ruleMessages() helper.
      title: { key: `aiAnalytics.recommendations.reduce.${flag.key}`, params: {} },
      reason: {
        key: "aiAnalytics.recommendations.reasons.reduceBehaviorSpending",
        params: { behavior: flag.key, count: flag.transactionCount, amount: flag.totalAmount },
      },
      action: { key: "aiAnalytics.recommendations.actions.reduceBehaviorSpending", params: { behavior: flag.key } },
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "reduceBehaviorSpending",
  name: "Reduce Behavior Spending",
  description: "Unconditional recommendation for reducible behavior flags with real spend (currently just convenienceStore).",
  category: "behavior",
  defaultPriority: "low",
  enabled: true,
  evaluate,
};

export default rule;
