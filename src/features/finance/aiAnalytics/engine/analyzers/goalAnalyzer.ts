import { getCurrentPeriodRange, isDateWithinRange } from "@/features/finance/utils/periodRange";
import { parseLocalDate } from "@/utils/localDate";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";

export interface GoalProgressEntry {
  goal: Goal;
  progressPercent: number;
  isComplete: boolean;
  // Null when the goal has no deadline — pace/schedule rules simply don't
  // fire for it (Goal has no createdAt/start field, so there's no fair
  // baseline to project a smooth expected-progress curve from either way).
  daysRemaining: number | null;
  isDeadlinePassedIncomplete: boolean;
  milestonesCrossedThisMonth: number;
}

function daysUntil(deadline: string, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((parseLocalDate(deadline).getTime() - now.getTime()) / msPerDay);
}

export function analyzeGoals(goals: Goal[], goalMilestoneEvents: GoalMilestoneEvent[], now = new Date()): GoalProgressEntry[] {
  const monthRange = getCurrentPeriodRange("monthly", now);

  return goals.map((goal) => {
    const progressPercent = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const isComplete = goal.currentAmount >= goal.targetAmount;
    const daysRemaining = goal.deadline ? daysUntil(goal.deadline, now) : null;
    const isDeadlinePassedIncomplete = !isComplete && daysRemaining !== null && daysRemaining < 0;

    const milestonesCrossedThisMonth = goalMilestoneEvents.filter(
      (e) => e.goalSyncId === goal.syncId && isDateWithinRange(e.reachedAt.slice(0, 10), monthRange)
    ).length;

    return { goal, progressPercent, isComplete, daysRemaining, isDeadlinePassedIncomplete, milestonesCrossedThisMonth };
  });
}
