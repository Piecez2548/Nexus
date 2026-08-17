import { describe, expect, it } from "vitest";
import { computeCaloriesBurned } from "./calorieCalc";

describe("computeCaloriesBurned", () => {
  it("computes from reps × rounds when caloriesPerRep is set", () => {
    const result = computeCaloriesBurned({ caloriesPerRep: 0.5 }, { reps: 10, rounds: 3 });
    expect(result).toBe(15); // 10 * 3 * 0.5
  });

  it("computes from duration when caloriesPerMinute is set", () => {
    const result = computeCaloriesBurned({ caloriesPerMinute: 8 }, { durationMinutes: 5 });
    expect(result).toBe(40);
  });

  it("computes from distance when caloriesPerKm is set", () => {
    const result = computeCaloriesBurned({ caloriesPerKm: 60 }, { distanceMeters: 2500 });
    expect(result).toBe(150); // 2.5km * 60
  });

  it("sums all three bases when the exercise defines them and the input supplies all three", () => {
    const result = computeCaloriesBurned(
      { caloriesPerRep: 1, caloriesPerMinute: 2, caloriesPerKm: 10 },
      { reps: 5, rounds: 2, durationMinutes: 3, distanceMeters: 1000 },
    );
    expect(result).toBe(10 + 6 + 10); // 5*2*1 + 2*3 + 10*1
  });

  it("returns 0 when neither the exercise defines a rate nor the input supplies anything usable", () => {
    expect(computeCaloriesBurned({}, {})).toBe(0);
  });

  it("defaults rounds to 1 when reps are given without an explicit round count", () => {
    const result = computeCaloriesBurned({ caloriesPerRep: 2 }, { reps: 10 });
    expect(result).toBe(20);
  });
});
