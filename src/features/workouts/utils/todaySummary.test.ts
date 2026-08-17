import { describe, expect, it } from "vitest";
import { computeTodaySummary, getLoggedDates } from "./todaySummary";
import type { WorkoutEntry } from "@/features/workouts/types";

function entry(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    exerciseName: "Push-up",
    date: "2026-08-17",
    caloriesBurned: 10,
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeTodaySummary", () => {
  it("sums only today's entries, using a locally-constructed Date (never new Date(\"YYYY-MM-DD\"))", () => {
    // Deliberately a local-constructor date, matching streak.test.ts's own
    // convention -- a UTC-parsed date would drift across the day boundary
    // in a non-UTC timezone.
    const today = new Date(2026, 7, 17); // August 17, 2026

    const entries = [
      entry({ date: "2026-08-17", caloriesBurned: 10, reps: 10, rounds: 2, durationMinutes: 5 }),
      entry({ date: "2026-08-17", exerciseName: "Squat", caloriesBurned: 20, reps: 8, rounds: 3, durationMinutes: 4 }),
      entry({ date: "2026-08-16", caloriesBurned: 999 }), // yesterday, must be excluded
    ];

    const summary = computeTodaySummary(entries, today);

    expect(summary.totalCalories).toBe(30);
    expect(summary.totalDurationMinutes).toBe(9);
    expect(summary.totalReps).toBe(10 * 2 + 8 * 3);
    expect(summary.totalRounds).toBe(5);
    expect(summary.exerciseCount).toBe(2);
  });

  it("returns all zeros when nothing was logged today", () => {
    const summary = computeTodaySummary([entry({ date: "2026-08-16" })], new Date(2026, 7, 17));
    expect(summary).toEqual({ totalCalories: 0, totalDurationMinutes: 0, totalReps: 0, totalRounds: 0, exerciseCount: 0 });
  });
});

describe("getLoggedDates", () => {
  it("dedupes multiple same-day entries into one date", () => {
    const dates = getLoggedDates([entry({ date: "2026-08-17" }), entry({ date: "2026-08-17", exerciseName: "Squat" }), entry({ date: "2026-08-16" })]);
    expect(dates.sort()).toEqual(["2026-08-16", "2026-08-17"]);
  });
});
