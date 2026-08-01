import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

const NEARLY_COMPLETE_THRESHOLD_PERCENT = 90;

function evaluate(context: RuleContext): RecommendationDraft[] {
  return context.goalProgress
    .filter((entry) => !entry.isComplete && entry.progressPercent >= NEARLY_COMPLETE_THRESHOLD_PERCENT)
    .map((entry) => ({
      id: `goal-nearly-complete-${entry.goal.syncId ?? entry.goal.id}`,
      key: "goalNearlyComplete",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { goalName: entry.goal.name, percent: Math.round(entry.progressPercent) },
      ...ruleMessages("goalNearlyComplete", { goalName: entry.goal.name }, { goalName: entry.goal.name, percent: Math.round(entry.progressPercent) }),
    }));
}

const rule: FinancialRule = {
  id: "goalNearlyComplete",
  name: "Goal Nearly Complete",
  description: "Fires for any incomplete goal at 90%+ progress.",
  category: "goals",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
