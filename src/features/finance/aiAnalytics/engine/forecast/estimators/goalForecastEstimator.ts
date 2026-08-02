// Goal Forecast is genuinely new work — Goal has no creation-date field,
// and GoalMilestoneEvent tracks only tier-crossing TIMESTAMPS (25/50/75/
//100), no contribution amounts. The only real historical-pace signal
// available is the gap between a goal's two most recent milestone
// crossings; with fewer than 2 events there is no pace signal at all, and
// this never fabricates one.

import { daysBetween } from "@/features/finance/aiAnalytics/engine/forecast/predictors/periodForecastCalculator";
import { AVERAGE_DAYS_PER_MONTH, addDays } from "@/features/finance/aiAnalytics/engine/forecast/calculators/mathUtils";
import { clamp } from "@/features/finance/aiAnalytics/engine/shared/mathUtils";
import { toLocalDateString } from "@/utils/localDate";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";
import type { GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";

// Hitting exactly the required pace scores this, not 100 — real-world
// variance could still cause a miss even right on pace. Comfortably
// exceeding the required pace approaches 100; undershooting scales down
// proportionally. An explainable heuristic, not a statistical model.
const ON_PACE_PROBABILITY = 70;

// ฿/day pace derived from the gap between a goal's two most recent
// milestone-tier crossings. Null (never fabricated) unless the goal has a
// syncId (so events can even be joined to it) and at least 2 events.
function derivePaceFromMilestones(goal: Goal, events: GoalMilestoneEvent[]): number | null {
  if (!goal.syncId) return null;

  const goalEvents = events.filter((e) => e.goalSyncId === goal.syncId).sort((a, b) => a.reachedAt.localeCompare(b.reachedAt));
  if (goalEvents.length < 2) return null;

  const [older, newer] = goalEvents.slice(-2);
  const tierAmountDelta = ((newer.tier - older.tier) / 100) * goal.targetAmount;
  const days = daysBetween(new Date(older.reachedAt), new Date(newer.reachedAt));
  if (days <= 0) return null;

  return tierAmountDelta / days;
}

export function estimateGoalForecast(goal: Goal, events: GoalMilestoneEvent[], now = new Date()): GoalForecastEntry {
  const isComplete = goal.currentAmount >= goal.targetAmount;
  const remainingAmount = goal.targetAmount - goal.currentAmount;

  const pace = derivePaceFromMilestones(goal, events);
  const paceKnown = pace !== null;
  const monthlyProgressAmount = paceKnown ? pace! * AVERAGE_DAYS_PER_MONTH : null;

  const expectedCompletionDateObj = paceKnown && pace! > 0 && !isComplete ? addDays(now, Math.ceil(remainingAmount / pace!)) : null;
  const expectedCompletionDate = expectedCompletionDateObj ? toLocalDateString(expectedCompletionDateObj) : null;

  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const daysUntilDeadline = deadlineDate ? daysBetween(now, deadlineDate) : null;

  // Pure arithmetic: always computable given a deadline still ahead of us
  // and an incomplete goal, independent of pace data — the one field
  // available even with zero milestone history.
  const requiredMonthlyContribution = !isComplete && daysUntilDeadline !== null && daysUntilDeadline > 0 ? (remainingAmount / daysUntilDeadline) * AVERAGE_DAYS_PER_MONTH : null;

  const probabilityOfCompletion =
    requiredMonthlyContribution !== null && requiredMonthlyContribution > 0 && monthlyProgressAmount !== null
      ? clamp(Math.round((monthlyProgressAmount / requiredMonthlyContribution) * ON_PACE_PROBABILITY), 0, 100)
      : null;

  // Computed from pace alone (not gated on the deadline still being ahead
  // of us) — this is exactly the forward-looking signal that matters most
  // once a deadline has already passed, distinct from the existing
  // goalBehindSchedule rule, which only fires after the fact.
  const projectedDelayDays = expectedCompletionDateObj !== null && deadlineDate !== null ? daysBetween(deadlineDate, expectedCompletionDateObj) : null;

  return { goal, paceKnown, monthlyProgressAmount, expectedCompletionDate, requiredMonthlyContribution, probabilityOfCompletion, projectedDelayDays };
}

export function estimateGoalForecasts(goals: Goal[], events: GoalMilestoneEvent[], now = new Date()): GoalForecastEntry[] {
  return goals.map((goal) => estimateGoalForecast(goal, events, now));
}
