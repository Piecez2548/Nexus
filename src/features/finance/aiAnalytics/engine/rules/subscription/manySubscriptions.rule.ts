import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const MANY_SUBSCRIPTIONS_MIN_COUNT = 3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const subscriptions = context.behaviorAnalysis.subscriptions;
  if (subscriptions.length < MANY_SUBSCRIPTIONS_MIN_COUNT) return [];

  const total = Math.round(subscriptions.reduce((sum, s) => sum + s.averageAmount, 0));

  return [
    {
      id: "many-subscriptions",
      key: "manySubscriptions",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { count: subscriptions.length, total },
      ...ruleMessages("manySubscriptions", {}, { count: subscriptions.length, total }),
    },
  ];
}

const rule: FinancialRule = {
  id: "manySubscriptions",
  name: "Many Subscriptions",
  description: "Fires when 3+ recurring subscriptions are detected, with their combined monthly total.",
  category: "subscriptions",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
