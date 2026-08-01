import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const MIN_NIGHT_TRANSACTIONS = 3;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const flag = context.behaviorAnalysis.flags.find((f) => f.key === "nightSpending");
  if (!flag || flag.dataQuality === "unavailable" || flag.transactionCount < MIN_NIGHT_TRANSACTIONS) return [];

  const estimatedMonthlySavings = Math.round(flag.totalAmount * REDUCTION_ASSUMPTION);
  return [
    {
      id: "late-night-spending",
      key: "lateNightSpending",
      priority: "information",
      estimatedMonthlySavings,
      // Thin time-of-day coverage makes this less trustworthy than a
      // full-data reading.
      confidence: flag.dataQuality === "full" ? "medium" : "low",
      params: { count: flag.transactionCount, amount: Math.round(flag.totalAmount) },
      ...ruleMessages("lateNightSpending", {}, { count: flag.transactionCount, amount: Math.round(flag.totalAmount) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "lateNightSpending",
  name: "Late-Night Spending",
  description: "Surfaces the nightSpending behavior flag as an actual recommendation once it has 3+ transactions.",
  category: "behavior",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
