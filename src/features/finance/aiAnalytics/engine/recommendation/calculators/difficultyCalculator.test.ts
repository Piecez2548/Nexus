import { describe, expect, it } from "vitest";
import { calculateDifficulty, expectedCompletionTimeFor } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/difficultyCalculator";

describe("calculateDifficulty", () => {
  it("is always easy for information-priority recommendations regardless of category", () => {
    expect(calculateDifficulty("information", "income")).toBe("easy");
    expect(calculateDifficulty("information", "investment")).toBe("easy");
  });

  it.each([
    ["food", "easy"],
    ["restaurant", "easy"],
    ["coffee", "easy"],
    ["entertainment", "easy"],
    ["subscriptions", "easy"],
    ["shopping", "moderate"],
    ["transport", "moderate"],
    ["budget", "moderate"],
    ["saving", "moderate"],
    ["cashFlow", "moderate"],
    ["goals", "moderate"],
    ["general", "moderate"],
    ["income", "hard"],
    ["investment", "hard"],
  ] as const)("maps category %s to difficulty %s", (category, expected) => {
    expect(calculateDifficulty("medium", category)).toBe(expected);
  });
});

describe("expectedCompletionTimeFor", () => {
  it.each([
    ["easy", "immediate"],
    ["moderate", "thisMonth"],
    ["hard", "within3Months"],
  ] as const)("maps difficulty %s to %s", (difficulty, expected) => {
    expect(expectedCompletionTimeFor(difficulty)).toBe(expected);
  });
});
