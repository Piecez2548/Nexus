import { describe, expect, it } from "vitest";
import { gradeForScore, mergeScoringConfig, DEFAULT_SCORE_WEIGHTS, DEFAULT_SCORE_THRESHOLDS } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";

describe("gradeForScore", () => {
  it.each([
    [100, "A+"],
    [95, "A+"],
    [94, "A"],
    [90, "A"],
    [89, "B+"],
    [80, "B+"],
    [79, "B"],
    [70, "B"],
    [69, "C"],
    [60, "C"],
    [59, "D"],
    [50, "D"],
    [49, "F"],
    [0, "F"],
  ])("grades %i as %s", (score, expectedGrade) => {
    expect(gradeForScore(score).grade).toBe(expectedGrade);
  });
});

describe("mergeScoringConfig", () => {
  it("returns the defaults verbatim with no overrides", () => {
    expect(mergeScoringConfig()).toEqual({
      weights: DEFAULT_SCORE_WEIGHTS,
      gradeTable: expect.any(Array),
      thresholds: DEFAULT_SCORE_THRESHOLDS,
    });
  });

  it("overrides only the given weight, keeping every other weight at its default", () => {
    const config = mergeScoringConfig({ weights: { ...DEFAULT_SCORE_WEIGHTS, savingRate: 40 } });
    expect(config.weights.savingRate).toBe(40);
    expect(config.weights.budgetDiscipline).toBe(DEFAULT_SCORE_WEIGHTS.budgetDiscipline);
  });

  it("overrides a whole threshold group without disturbing other groups", () => {
    const config = mergeScoringConfig({ thresholds: { ...DEFAULT_SCORE_THRESHOLDS, goalProgress: { nearCompletePercent: 75 } } });
    expect(config.thresholds.goalProgress.nearCompletePercent).toBe(75);
    expect(config.thresholds.savingRate).toEqual(DEFAULT_SCORE_THRESHOLDS.savingRate);
  });
});
