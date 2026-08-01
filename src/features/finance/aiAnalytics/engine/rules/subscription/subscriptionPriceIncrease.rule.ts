import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Deliberately below computeSubscriptions' own 10% amount-tolerance band
// (behaviorAnalysis.ts's SUBSCRIPTION_AMOUNT_TOLERANCE) — anything priced
// beyond that tolerance between occurrences never qualifies as a detected
// subscription in the first place, so this can only ever fire within that
// same 0-10% window.
const PRICE_INCREASE_THRESHOLD_PERCENT = 5;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const sub of context.behaviorAnalysis.subscriptions) {
    if (sub.previousAmount <= 0 || sub.lastAmount <= sub.previousAmount) continue;

    const percent = Math.round(((sub.lastAmount - sub.previousAmount) / sub.previousAmount) * 100);
    if (percent < PRICE_INCREASE_THRESHOLD_PERCENT) continue;

    recommendations.push({
      id: `subscription-price-increase-${sub.normalizedTitle}`,
      key: "subscriptionPriceIncrease",
      priority: "medium",
      estimatedMonthlySavings: Math.round(sub.lastAmount - sub.previousAmount),
      confidence: "high",
      params: { title: sub.representativeTitle, percent },
      ...ruleMessages(
        "subscriptionPriceIncrease",
        { title: sub.representativeTitle },
        { title: sub.representativeTitle, percent, previousAmount: Math.round(sub.previousAmount), lastAmount: Math.round(sub.lastAmount) }
      ),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "subscriptionPriceIncrease",
  name: "Subscription Price Increase",
  description: "Fires per subscription whose most recent charge rose 5%+ over its previous one.",
  category: "subscriptions",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
