import { beforeEach, describe, expect, it } from "vitest";

import { categorize } from "@/features/finance/slipScanner/ai/transactionCategorizer";

import { useCategoryLearningStore } from "./categoryLearningStore";

beforeEach(() => useCategoryLearningStore.getState().reset());

describe("useCategoryLearningStore", () => {
  it("learns a correction and feeds it back to the categorizer", () => {
    useCategoryLearningStore.getState().learn("Starbucks", "Others");
    const learned = useCategoryLearningStore.getState().asMap();
    expect(categorize("starbucks", learned).category).toBe("Others");
  });

  it("normalises the key so casing/whitespace doesn't matter", () => {
    useCategoryLearningStore.getState().learn("  My Cafe  ", "Food");
    expect(useCategoryLearningStore.getState().corrections["my cafe"]).toBe("Food");
  });

  it("reset clears corrections", () => {
    useCategoryLearningStore.getState().learn("x", "Food");
    useCategoryLearningStore.getState().reset();
    expect(useCategoryLearningStore.getState().corrections).toEqual({});
  });
});
