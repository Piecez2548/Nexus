import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// Goals have no contribution history to measure a real "rate" from
// (goalStore.contribute() only mutates currentAmount) — this reinterprets
// "acceleration" using GoalMilestoneEvent.reachedAt instead, which does
// have real timestamps: crossing 2+ tiers in one month is a genuine burst
// of progress.
const ACCELERATION_MIN_MILESTONES_THIS_MONTH = 2;

function evaluate(context: RuleContext): RecommendationDraft[] {
  return context.goalProgress
    .filter((entry) => entry.milestonesCrossedThisMonth >= ACCELERATION_MIN_MILESTONES_THIS_MONTH)
    .map((entry) => ({
      id: `goal-acceleration-${entry.goal.syncId ?? entry.goal.id}`,
      key: "goalAcceleration",
      priority: "information",
      estimatedMonthlySavings: 0,
      confidence: "high",
      params: { goalName: entry.goal.name, milestones: entry.milestonesCrossedThisMonth },
      ...ruleMessages("goalAcceleration", { goalName: entry.goal.name }, { goalName: entry.goal.name, milestones: entry.milestonesCrossedThisMonth }),
    }));
}

const rule: FinancialRule = {
  id: "goalAcceleration",
  name: "Goal Acceleration",
  description: "Fires when a goal crosses 2 or more milestone tiers within the current month.",
  category: "goals",
  defaultPriority: "information",
  enabled: true,
  evaluate,
};

export default rule;
