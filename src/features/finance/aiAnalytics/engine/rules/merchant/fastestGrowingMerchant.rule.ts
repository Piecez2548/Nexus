import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

const GROWTH_THRESHOLD_PERCENT = 50;

function evaluate(context: RuleContext): RecommendationDraft[] {
  let best: { merchant: TopMerchantEntry; percent: number } | null = null;

  for (const merchant of context.behaviorAnalysis.topMerchants) {
    const trend = merchant.monthlyTrend;
    if (trend.length < 2) continue;

    const current = trend[trend.length - 1].amount;
    const previous = trend[trend.length - 2].amount;
    if (previous <= 0 || current <= previous) continue;

    // previous > 0 is guaranteed by the guard above, so pctChange's
    // prev===0 null branch can never trigger here.
    const percent = pctChange(current, previous)!;
    if (percent > GROWTH_THRESHOLD_PERCENT && (!best || percent > best.percent)) {
      best = { merchant, percent };
    }
  }

  if (!best) return [];

  const percent = Math.round(best.percent);
  return [
    {
      id: "fastest-growing-merchant",
      key: "fastestGrowingMerchant",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { merchant: best.merchant.alias, percent },
      ...ruleMessages("fastestGrowingMerchant", { merchant: best.merchant.alias }, { merchant: best.merchant.alias, percent }),
    },
  ];
}

const rule: FinancialRule = {
  id: "fastestGrowingMerchant",
  name: "Fastest Growing Merchant",
  description: "Fires for the top merchant whose spend grew 50%+ month-over-month, among the top 5 merchants.",
  category: "merchant",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
