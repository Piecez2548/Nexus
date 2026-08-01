import { describe, expect, it } from "vitest";
import { EXAMPLE_QUESTION_KEY_BY_INTENT, NEXT_QUESTION_BY_INTENT } from "./nextQuestionMap";
import type { CoachIntent } from "@/features/finance/aiAnalytics/engine/coach/types";

const ALL_INTENTS: CoachIntent[] = [
  "financialOverview",
  "expenseAnalysis",
  "incomeAnalysis",
  "budgetStatus",
  "savingsProgress",
  "cashFlow",
  "financialHealthScore",
  "categorySpending",
  "merchantSpending",
  "restaurantAnalysis",
  "coffeeAnalysis",
  "shoppingAnalysis",
  "forecast",
  "goalProgress",
  "recommendations",
  "behaviorAnalysis",
];

describe("NEXT_QUESTION_BY_INTENT", () => {
  it("has an entry for all 16 intents", () => {
    expect(Object.keys(NEXT_QUESTION_BY_INTENT).sort()).toEqual([...ALL_INTENTS].sort());
  });

  it("never points an intent back to itself", () => {
    for (const intent of ALL_INTENTS) {
      expect(NEXT_QUESTION_BY_INTENT[intent]).not.toBe(intent);
    }
  });

  it("only points to real, known intents", () => {
    for (const intent of ALL_INTENTS) {
      expect(ALL_INTENTS).toContain(NEXT_QUESTION_BY_INTENT[intent]);
    }
  });
});

describe("EXAMPLE_QUESTION_KEY_BY_INTENT", () => {
  it("has a fully-qualified i18n key for all 16 intents", () => {
    for (const intent of ALL_INTENTS) {
      expect(EXAMPLE_QUESTION_KEY_BY_INTENT[intent]).toMatch(/^aiAnalytics\.aiCoach\.examples\./);
    }
  });

  it("has a unique key per intent", () => {
    const keys = Object.values(EXAMPLE_QUESTION_KEY_BY_INTENT);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
