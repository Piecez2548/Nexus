import { describe, expect, it } from "vitest";
import { workoutEntrySchema } from "./workoutEntrySchema";

const t = (key: string) => key;

const valid = { exerciseName: "Push-up", date: "2026-08-17", caloriesBurned: 15 };

describe("workoutEntrySchema", () => {
  it("accepts a valid entry with only the required fields", () => {
    expect(workoutEntrySchema(t).safeParse(valid).success).toBe(true);
  });

  it("accepts optional reps/rounds/duration/distance fields when present", () => {
    const result = workoutEntrySchema(t).safeParse({ ...valid, reps: 10, rounds: 3, durationMinutes: 5, distanceMeters: 1000 });
    expect(result.success).toBe(true);
  });

  it("rejects an empty exercise name", () => {
    expect(workoutEntrySchema(t).safeParse({ ...valid, exerciseName: "" }).success).toBe(false);
  });

  it("rejects an empty date", () => {
    expect(workoutEntrySchema(t).safeParse({ ...valid, date: "" }).success).toBe(false);
  });

  it("rejects a missing caloriesBurned", () => {
    const { caloriesBurned: _omit, ...rest } = valid;
    expect(workoutEntrySchema(t).safeParse(rest).success).toBe(false);
  });
});
