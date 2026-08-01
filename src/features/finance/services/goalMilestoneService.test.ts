import { describe, expect, it, beforeEach } from "vitest";
import { checkAndLogCrossings, tiersCrossed } from "./goalMilestoneService";
import { db } from "@/database/db";
import type { Goal } from "@/features/finance/types";

describe("tiersCrossed", () => {
  it("returns tiers strictly between previous (exclusive) and new (inclusive)", () => {
    expect(tiersCrossed(0, 30)).toEqual([25]);
  });

  it("returns every tier jumped past in one update", () => {
    expect(tiersCrossed(0, 80)).toEqual([25, 50, 75]);
  });

  it("returns nothing when percentage didn't change", () => {
    expect(tiersCrossed(20, 20)).toEqual([]);
  });

  it("returns nothing when percentage moved down", () => {
    expect(tiersCrossed(60, 40)).toEqual([]);
  });

  it("includes the boundary tier exactly at 25/50/75/100", () => {
    expect(tiersCrossed(24, 25)).toEqual([25]);
    expect(tiersCrossed(99, 100)).toEqual([100]);
  });

  it("returns nothing when already past every tier", () => {
    expect(tiersCrossed(100, 150)).toEqual([]);
  });
});

function goal(overrides: Partial<Goal> = {}): Goal {
  return { name: "MacBook", targetAmount: 1000, currentAmount: 0, syncId: "goal-1", ...overrides };
}

describe("checkAndLogCrossings", () => {
  beforeEach(async () => {
    await db.goalMilestoneEvents.clear();
  });

  it("logs a single event when a goal crosses its first tier", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 300 }), 0);

    const events = await db.goalMilestoneEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ goalSyncId: "goal-1", goalName: "MacBook", tier: 25 });
  });

  it("logs every tier jumped past in a single large contribution", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 900 }), 0);

    const events = await db.goalMilestoneEvents.toArray();
    expect(events.map((e) => e.tier).sort()).toEqual([25, 50, 75]);
  });

  it("does nothing when no syncId is present yet (unsynced local goal)", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 500, syncId: undefined }), 0);
    expect(await db.goalMilestoneEvents.count()).toBe(0);
  });

  it("does nothing for a zero or negative target (avoids divide-by-zero)", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 500, targetAmount: 0 }), 0);
    expect(await db.goalMilestoneEvents.count()).toBe(0);
  });

  it("does not duplicate a tier already logged for the same goal", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 300 }), 0);
    await checkAndLogCrossings(goal({ currentAmount: 300 }), 0); // re-invoked with the same stale previousAmount

    const events = await db.goalMilestoneEvents.toArray();
    expect(events).toHaveLength(1);
  });

  it("never logs a tier for a goal edited downward", async () => {
    await checkAndLogCrossings(goal({ currentAmount: 200 }), 600);
    expect(await db.goalMilestoneEvents.count()).toBe(0);
  });
});
