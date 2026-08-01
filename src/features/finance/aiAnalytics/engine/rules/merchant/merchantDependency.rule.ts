import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const DEPENDENCY_THRESHOLD_PERCENT = 25;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const merchants = context.behaviorAnalysis.topMerchants;
  // With only one merchant on record, a 100% share is a data-sparsity
  // artifact, not a real dependency signal — needs at least 2 to compare.
  if (merchants.length < 2) return [];

  const totalAcrossTopMerchants = merchants.reduce((sum, m) => sum + m.totalAmount, 0);
  if (totalAcrossTopMerchants <= 0) return [];

  const top = merchants[0];
  const percent = (top.totalAmount / totalAcrossTopMerchants) * 100;
  if (percent <= DEPENDENCY_THRESHOLD_PERCENT) return [];

  return [
    {
      id: "merchant-dependency",
      key: "merchantDependency",
      priority: "medium",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { merchant: top.alias, percent: Math.round(percent) },
      ...ruleMessages("merchantDependency", { merchant: top.alias }, { merchant: top.alias, percent: Math.round(percent) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "merchantDependency",
  name: "Merchant Dependency",
  description: "Fires when the top merchant accounts for over 25% of spend across the top 5 merchants.",
  category: "merchant",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
