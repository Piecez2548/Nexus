import { describe, expect, it, beforeEach } from "vitest";
import { useGoalStore } from "./goalStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { db } from "@/database/db";

describe("goalStore gamification", () => {
  beforeEach(async () => {
    await db.goals.clear();
    useGoalStore.setState({ goals: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("awards routine contribution xp when the goal isn't finished yet", async () => {
    const id = await db.goals.add({ name: "MacBook", targetAmount: 1000, currentAmount: 0 });
    useGoalStore.setState({ goals: [{ id, name: "MacBook", targetAmount: 1000, currentAmount: 0 }] });

    await useGoalStore.getState().contribute(id, 500);
    expect(useGamificationStore.getState().xp).toBe(10);
  });

  it("awards a completion bonus when a contribution first reaches the target", async () => {
    const id = await db.goals.add({ name: "MacBook", targetAmount: 1000, currentAmount: 900 });
    useGoalStore.setState({ goals: [{ id, name: "MacBook", targetAmount: 1000, currentAmount: 900 }] });

    await useGoalStore.getState().contribute(id, 100);
    expect(useGamificationStore.getState().xp).toBe(60); // 10 routine + 50 completion bonus
  });

  it("does not repeat the completion bonus on a later contribution to an already-complete goal", async () => {
    const id = await db.goals.add({ name: "MacBook", targetAmount: 1000, currentAmount: 1000 });
    useGoalStore.setState({ goals: [{ id, name: "MacBook", targetAmount: 1000, currentAmount: 1000 }] });

    await useGoalStore.getState().contribute(id, 200);
    expect(useGamificationStore.getState().xp).toBe(10);
  });
});
