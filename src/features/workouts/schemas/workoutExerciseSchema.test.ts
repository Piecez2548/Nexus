import { describe, expect, it } from "vitest";
import { workoutExerciseSchema } from "./workoutExerciseSchema";

const t = (key: string) => key;

const valid = { name: "Push-up", category: "strength", icon: "dumbbell", color: "#3b82f6" };

describe("workoutExerciseSchema", () => {
  it("accepts a valid exercise", () => {
    expect(workoutExerciseSchema(t).safeParse(valid).success).toBe(true);
  });

  it("accepts optional calorie/GPS/YouTube fields when present", () => {
    const result = workoutExerciseSchema(t).safeParse({
      ...valid,
      caloriesPerMinute: 8,
      caloriesPerRep: 0.3,
      caloriesPerKm: 60,
      gpsTracked: true,
      youtubeUrl: "https://youtube.com/watch?v=abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(workoutExerciseSchema(t).safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects an invalid category", () => {
    expect(workoutExerciseSchema(t).safeParse({ ...valid, category: "running" }).success).toBe(false);
  });

  it("rejects a missing icon or color", () => {
    expect(workoutExerciseSchema(t).safeParse({ ...valid, icon: "" }).success).toBe(false);
    expect(workoutExerciseSchema(t).safeParse({ ...valid, color: "" }).success).toBe(false);
  });
});
