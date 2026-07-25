import { describe, expect, it, beforeEach } from "vitest";
import { useHabitStore } from "./habitStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { db } from "@/database/db";
import type { Habit } from "@/features/habits/types";

// A factory, not a shared const — Dexie's `table.add()` mutates its input
// object by stamping the generated `id` back onto it, so reusing one object
// literal across `.add()` calls would leak an `id` from an earlier call into
// a later one and collide on the primary key.
function sample(overrides: Partial<Habit> = {}): Habit {
  return {
    name: "Exercise",
    frequency: "daily",
    completedDates: [],
    createdAt: "2026-07-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("habitStore gamification", () => {
  beforeEach(async () => {
    await db.habits.clear();
    useHabitStore.setState({ habits: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("awards check-in xp and appends today's date on the first check-in of the day", async () => {
    const id = await db.habits.add(sample());
    useHabitStore.setState({ habits: [sample({ id })] });

    await useHabitStore.getState().checkIn(id);

    expect(useGamificationStore.getState().xp).toBe(8);
    const [habit] = useHabitStore.getState().habits;
    expect(habit.completedDates).toHaveLength(1);
  });

  it("is idempotent — checking in again the same day awards no extra xp and adds no duplicate date", async () => {
    const id = await db.habits.add(sample());
    useHabitStore.setState({ habits: [sample({ id })] });

    await useHabitStore.getState().checkIn(id);
    await useHabitStore.getState().checkIn(id);

    expect(useGamificationStore.getState().xp).toBe(8);
    const [habit] = useHabitStore.getState().habits;
    expect(habit.completedDates).toHaveLength(1);
  });
});
