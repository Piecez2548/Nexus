import { describe, expect, it } from "vitest";
import { estimateGoalForecast, estimateGoalForecasts } from "./goalForecastEstimator";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";

const now = new Date(2026, 6, 15);

function goal(overrides: Partial<Goal> = {}): Goal {
  return { name: "Vacation", targetAmount: 10000, currentAmount: 5000, syncId: "goal-1", ...overrides };
}

function milestone(overrides: Partial<GoalMilestoneEvent> = {}): GoalMilestoneEvent {
  return { goalSyncId: "goal-1", goalName: "Vacation", tier: 25, reachedAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

describe("estimateGoalForecast", () => {
  it("has no pace signal with 0 milestone events", () => {
    const result = estimateGoalForecast(goal(), [], now);
    expect(result.paceKnown).toBe(false);
    expect(result.monthlyProgressAmount).toBeNull();
    expect(result.expectedCompletionDate).toBeNull();
  });

  it("has no pace signal with only 1 milestone event", () => {
    const events = [milestone({ tier: 25, reachedAt: "2026-01-01T00:00:00.000Z" })];
    const result = estimateGoalForecast(goal(), events, now);
    expect(result.paceKnown).toBe(false);
  });

  it("derives a real pace from the two most recent milestone events", () => {
    const events = [
      milestone({ tier: 25, reachedAt: "2026-01-01T00:00:00.000Z" }),
      milestone({ tier: 50, reachedAt: "2026-03-02T00:00:00.000Z" }), // 60 days later, 25% of 10000 = 2500 -> pace ≈ 41.67/day
    ];
    const result = estimateGoalForecast(goal({ targetAmount: 10000, currentAmount: 5000 }), events, now);

    expect(result.paceKnown).toBe(true);
    expect(result.monthlyProgressAmount).toBeCloseTo((2500 / 60) * 30.44, 2);
    expect(result.expectedCompletionDate).not.toBeNull();
  });

  it("still computes requiredMonthlyContribution with a deadline and zero pace history", () => {
    const result = estimateGoalForecast(goal({ targetAmount: 10000, currentAmount: 5000, deadline: "2027-01-15" }), [], now);
    expect(result.paceKnown).toBe(false);
    expect(result.requiredMonthlyContribution).not.toBeNull();
    expect(result.requiredMonthlyContribution).toBeGreaterThan(0);
    // No pace data -> no probability, even though requiredMonthlyContribution is known.
    expect(result.probabilityOfCompletion).toBeNull();
  });

  it("requiredMonthlyContribution and probability are null with no deadline at all", () => {
    const result = estimateGoalForecast(goal({ deadline: undefined }), [], now);
    expect(result.requiredMonthlyContribution).toBeNull();
    expect(result.probabilityOfCompletion).toBeNull();
    expect(result.projectedDelayDays).toBeNull();
  });

  it("every forward-looking field is null once the goal is already complete", () => {
    const result = estimateGoalForecast(goal({ targetAmount: 5000, currentAmount: 5000, deadline: "2027-01-15" }), [], now);
    expect(result.expectedCompletionDate).toBeNull();
    expect(result.requiredMonthlyContribution).toBeNull();
    expect(result.probabilityOfCompletion).toBeNull();
  });

  it("still projects a delay past an already-passed deadline, using pace alone", () => {
    const events = [
      milestone({ tier: 25, reachedAt: "2026-01-01T00:00:00.000Z" }),
      milestone({ tier: 50, reachedAt: "2026-03-02T00:00:00.000Z" }),
    ];
    const result = estimateGoalForecast(goal({ targetAmount: 10000, currentAmount: 5000, deadline: "2026-06-01" }), events, now);

    expect(result.expectedCompletionDate).not.toBeNull();
    // requiredMonthlyContribution is null (deadline already passed)...
    expect(result.requiredMonthlyContribution).toBeNull();
    // ...but projectedDelayDays is still computed from pace alone, and should be positive (late).
    expect(result.projectedDelayDays).not.toBeNull();
    expect(result.projectedDelayDays!).toBeGreaterThan(0);
  });

  it("estimateGoalForecasts maps over every goal", () => {
    const results = estimateGoalForecasts([goal({ name: "A" }), goal({ name: "B" })], [], now);
    expect(results.map((r) => r.goal.name)).toEqual(["A", "B"]);
  });
});
