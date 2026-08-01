import { goalMilestoneEventRepository } from "@/features/finance/repositories/goalMilestoneEventRepository";
import { goalMilestoneEventService } from "@/features/finance/services/goalMilestoneEventService";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import type { Goal, GoalMilestoneEvent, GoalMilestoneTier } from "@/features/finance/types";

export const MILESTONE_TIERS: GoalMilestoneTier[] = [25, 50, 75, 100];

// Tiers crossed for the first time by this specific update — i.e. in
// (previousPercentage, newPercentage]. A goal that jumps straight past 50
// to 80 crosses both 25 and 50 in one call; a goal edited *down* crosses
// nothing (never retroactively un-crosses a tier already logged).
export function tiersCrossed(previousPercentage: number, newPercentage: number): GoalMilestoneTier[] {
  return MILESTONE_TIERS.filter((tier) => previousPercentage < tier && newPercentage >= tier);
}

// Compares `goal`'s new percentage (currentAmount/targetAmount, using the
// goal's *current* targetAmount as the denominator for both sides of the
// comparison) against `previousAmount`, and persists any newly-crossed
// tier(s) not already logged for this goal. Runs only on the write path
// (goalStore's updateGoal/contribute) — the analytics engine only ever
// reads this table, never computes/backfills it.
export async function checkAndLogCrossings(goal: Goal, previousAmount: number): Promise<void> {
  if (!goal.syncId || goal.targetAmount <= 0) return;

  const previousPercentage = (previousAmount / goal.targetAmount) * 100;
  const newPercentage = (goal.currentAmount / goal.targetAmount) * 100;
  const crossed = tiersCrossed(previousPercentage, newPercentage);
  if (crossed.length === 0) return;

  const existing = await goalMilestoneEventRepository.getForGoal(goal.syncId);
  const alreadyLogged = new Set(existing.map((event) => event.tier));
  const newlyCrossed = crossed.filter((tier) => !alreadyLogged.has(tier));
  if (newlyCrossed.length === 0) return;

  for (const tier of newlyCrossed) {
    const event: GoalMilestoneEvent = {
      goalSyncId: goal.syncId,
      goalName: goal.name,
      tier,
      reachedAt: new Date().toISOString(),
    };
    await goalMilestoneEventService.create(event);
  }

  await useGoalMilestoneEventStore.getState().loadEvents();
}
