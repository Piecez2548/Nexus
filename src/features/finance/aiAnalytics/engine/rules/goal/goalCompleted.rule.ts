import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

function evaluate(context: RuleContext): RecommendationDraft[] {
  return context.goalProgress
    .filter((entry) => entry.isComplete)
    .map((entry) => ({
      id: `goal-completed-${entry.goal.syncId ?? entry.goal.id}`,
      key: "goalCompleted",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { goalName: entry.goal.name, targetAmount: entry.goal.targetAmount },
      ...ruleMessages("goalCompleted", { goalName: entry.goal.name }, { goalName: entry.goal.name, targetAmount: entry.goal.targetAmount }),
    }));
}

const rule: FinancialRule = {
  id: "goalCompleted",
  name: "Goal Completed",
  description: "Celebrates any goal that has reached or passed its target amount.",
  category: "goals",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
