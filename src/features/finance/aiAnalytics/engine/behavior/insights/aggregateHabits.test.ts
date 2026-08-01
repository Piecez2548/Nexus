import { describe, expect, it } from "vitest";
import { aggregateHabits } from "@/features/finance/aiAnalytics/engine/behavior/insights/aggregateHabits";
import type { DetectedHabit, HabitPolarity } from "@/features/finance/aiAnalytics/engine/behavior/types";

function habit(polarity: HabitPolarity, confidence: number): DetectedHabit {
  return { id: `${polarity}-${confidence}`, polarity, confidence, message: { key: "k", params: {} }, supportingMetrics: {} };
}

describe("aggregateHabits", () => {
  it("returns all-empty buckets with no habits", () => {
    expect(aggregateHabits([])).toEqual({ positiveHabits: [], negativeHabits: [], improvementOpportunities: [] });
  });

  it("buckets positive and negative habits separately, excluding neutral", () => {
    const positive = habit("positive", 80);
    const negative = habit("negative", 80);
    const neutral = habit("neutral", 80);
    const result = aggregateHabits([positive, negative, neutral]);
    expect(result.positiveHabits).toEqual([positive]);
    expect(result.negativeHabits).toEqual([negative]);
  });

  it("includes negative habits at or above the confidence threshold as improvement opportunities", () => {
    const confident = habit("negative", 50);
    const result = aggregateHabits([confident]);
    expect(result.improvementOpportunities).toEqual([confident.message]);
  });

  it("excludes low-confidence negative habits from improvement opportunities", () => {
    const unsure = habit("negative", 35);
    const result = aggregateHabits([unsure]);
    expect(result.negativeHabits).toEqual([unsure]);
    expect(result.improvementOpportunities).toEqual([]);
  });
});
