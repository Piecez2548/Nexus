import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];

  for (const entry of context.goalProgress) {
    if (!entry.isDeadlinePassedIncomplete || entry.daysRemaining === null) continue;

    const daysOverdue = Math.abs(entry.daysRemaining);
    const remainingAmount = Math.max(0, entry.goal.targetAmount - entry.goal.currentAmount);

    recommendations.push({
      id: `goal-behind-schedule-${entry.goal.syncId ?? entry.goal.id}`,
      key: "goalBehindSchedule",
      priority: "high",
      // Not a spending cut — the "savings" framing doesn't fit a goal
      // reminder, so this carries no estimate.
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { goalName: entry.goal.name, daysOverdue, remainingAmount },
      ...ruleMessages("goalBehindSchedule", { goalName: entry.goal.name }, { goalName: entry.goal.name, daysOverdue, remainingAmount }),
    });
  }

  return recommendations;
}

const rule: FinancialRule = {
  id: "goalBehindSchedule",
  name: "Goal Behind Schedule",
  description: "Fires for any goal whose deadline has passed while still incomplete.",
  category: "goals",
  defaultPriority: "high",
  enabled: true,
  evaluate,
};

export default rule;
