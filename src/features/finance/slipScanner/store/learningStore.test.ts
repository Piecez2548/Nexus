import { beforeEach, describe, expect, it } from "vitest";

import { applyMerchantMapping } from "@/features/finance/slipScanner/learning/applyLearning";

import { useLearningStore } from "./learningStore";

beforeEach(() => useLearningStore.getState().reset());

describe("useLearningStore", () => {
  it("learns a merchant mapping (normalised) usable by applyMerchantMapping", () => {
    useLearningStore.getState().learnMerchant("  My  Cafe ", "My Cafe Co.");
    expect(applyMerchantMapping("my cafe", useLearningStore.getState().merchantMap)).toBe("My Cafe Co.");
  });

  it("learns OCR fixes and bank naming", () => {
    useLearningStore.getState().learnOcr("l23", "123");
    useLearningStore.getState().learnBankName("scb", "SCB Easy");
    expect(useLearningStore.getState().ocrCorrections["l23"]).toBe("123");
    expect(useLearningStore.getState().bankNaming["scb"]).toBe("SCB Easy");
  });

  it("reset clears all learning", () => {
    useLearningStore.getState().learnMerchant("x", "y");
    useLearningStore.getState().reset();
    expect(useLearningStore.getState().merchantMap).toEqual({});
  });
});
