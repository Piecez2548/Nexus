import { describe, expect, it } from "vitest";
import { analyzeGoals } from "./goalAnalyzer";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function goal(overrides: Partial<Goal> = {}): Goal {
  return { id: 1, syncId: "goal-1", name: "MacBook", targetAmount: 1000, currentAmount: 0, ...overrides };
}

function milestone(overrides: Partial<GoalMilestoneEvent> = {}): GoalMilestoneEvent {
  return { id: 1, goalSyncId: "goal-1", goalName: "MacBook", tier: 25, reachedAt: "2026-07-10T00:00:00.000Z", ...overrides };
}

describe("analyzeGoals", () => {
  it("returns an empty array with no goals", () => {
    expect(analyzeGoals([], [], now)).toEqual([]);
  });

  it("computes progressPercent, clamped at 100", () => {
    const [entry] = analyzeGoals([goal({ currentAmount: 500, targetAmount: 1000 })], [], now);
    expect(entry.progressPercent).toBe(50);

    const [overfunded] = analyzeGoals([goal({ currentAmount: 1500, targetAmount: 1000 })], [], now);
    expect(overfunded.progressPercent).toBe(100);
  });

  it("marks a goal complete once currentAmount reaches targetAmount", () => {
    const [entry] = analyzeGoals([goal({ currentAmount: 1000, targetAmount: 1000 })], [], now);
    expect(entry.isComplete).toBe(true);
  });

  it("returns a null daysRemaining when there's no deadline", () => {
    const [entry] = analyzeGoals([goal({ deadline: undefined })], [], now);
    expect(entry.daysRemaining).toBeNull();
    expect(entry.isDeadlinePassedIncomplete).toBe(false);
  });

  it("computes daysRemaining from the deadline, positive for a future date", () => {
    const [entry] = analyzeGoals([goal({ deadline: "2026-07-31" })], [], now);
    expect(entry.daysRemaining).toBe(10);
  });

  it("flags isDeadlinePassedIncomplete when the deadline has passed and the goal isn't complete", () => {
    const [entry] = analyzeGoals([goal({ deadline: "2026-07-01", currentAmount: 200, targetAmount: 1000 })], [], now);
    expect(entry.daysRemaining).toBeLessThan(0);
    expect(entry.isDeadlinePassedIncomplete).toBe(true);
  });

  it("does not flag isDeadlinePassedIncomplete when the goal is already complete, even past deadline", () => {
    const [entry] = analyzeGoals([goal({ deadline: "2026-07-01", currentAmount: 1000, targetAmount: 1000 })], [], now);
    expect(entry.isDeadlinePassedIncomplete).toBe(false);
  });

  it("counts only milestones for this goal reached within the current month", () => {
    const events: GoalMilestoneEvent[] = [
      milestone({ goalSyncId: "goal-1", tier: 25, reachedAt: "2026-07-05T00:00:00.000Z" }),
      milestone({ goalSyncId: "goal-1", tier: 50, reachedAt: "2026-07-15T00:00:00.000Z" }),
      milestone({ goalSyncId: "goal-1", tier: 75, reachedAt: "2026-06-01T00:00:00.000Z" }), // last month, excluded
      milestone({ goalSyncId: "goal-2", tier: 25, reachedAt: "2026-07-10T00:00:00.000Z" }), // different goal, excluded
    ];
    const [entry] = analyzeGoals([goal({ syncId: "goal-1" })], events, now);
    expect(entry.milestonesCrossedThisMonth).toBe(2);
  });
});
