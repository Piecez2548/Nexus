import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Same per-transaction-average comparison as insights.ts's weekendOverspending
// insight — 2 weekend days can never outspend 5 weekdays in raw sums, so a
// literal total comparison would rarely fire. This is the recommendation
// counterpart (a distinct i18n namespace, aiAnalytics.recommendations.* vs
// aiAnalytics.insights.*, so the shared key name doesn't collide).
function evaluate(context: RuleContext): RecommendationDraft[] {
  const weekend = context.spendingAnalysis.weekdayAnalysis.filter((w) => w.weekday === 0 || w.weekday === 6);
  const weekday = context.spendingAnalysis.weekdayAnalysis.filter((w) => w.weekday >= 1 && w.weekday <= 5);
  const weekendCount = weekend.reduce((sum, w) => sum + w.count, 0);
  const weekdayCount = weekday.reduce((sum, w) => sum + w.count, 0);
  if (weekendCount === 0 || weekdayCount === 0) return [];

  const weekendAverage = weekend.reduce((sum, w) => sum + w.total, 0) / weekendCount;
  const weekdayAverage = weekday.reduce((sum, w) => sum + w.total, 0) / weekdayCount;
  if (weekendAverage <= weekdayAverage) return [];

  return [
    {
      id: "weekend-overspending",
      key: "weekendOverspending",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "medium",
      params: { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) },
      ...ruleMessages("weekendOverspending", {}, { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) }),
    },
  ];
}

const rule: FinancialRule = {
  id: "weekendOverspending",
  name: "Weekend Overspending",
  description: "Fires when this month's average weekend purchase exceeds the average weekday one.",
  category: "behavior",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
