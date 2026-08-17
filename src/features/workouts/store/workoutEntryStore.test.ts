import { describe, expect, it, beforeEach } from "vitest";
import { useWorkoutEntryStore } from "./workoutEntryStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { db } from "@/database/db";
import type { WorkoutEntry } from "@/features/workouts/types";

function sample(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    exerciseName: "Push-up",
    date: "2026-08-17",
    reps: 10,
    rounds: 3,
    caloriesBurned: 15,
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("workoutEntryStore gamification", () => {
  beforeEach(async () => {
    await db.workoutEntries.clear();
    useWorkoutEntryStore.setState({ entries: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("awards workoutLogged xp when a new entry is added", async () => {
    await useWorkoutEntryStore.getState().addEntry(sample());

    expect(useGamificationStore.getState().xp).toBe(8);
    expect(useWorkoutEntryStore.getState().entries).toHaveLength(1);
  });

  it("awards xp again for each additional entry logged (no dedup, unlike a habit check-in)", async () => {
    await useWorkoutEntryStore.getState().addEntry(sample());
    await useWorkoutEntryStore.getState().addEntry(sample({ exerciseName: "Squat" }));

    expect(useGamificationStore.getState().xp).toBe(16);
    expect(useWorkoutEntryStore.getState().entries).toHaveLength(2);
  });
});
