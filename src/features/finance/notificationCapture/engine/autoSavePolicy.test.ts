import { describe, expect, it } from "vitest";

import { categoryLearningKey, type SlipCategory } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { isHighConfidenceNotification } from "./autoSavePolicy";

const learned = new Map<string, SlipCategory>([[categoryLearningKey("7-Eleven"), "Food" as SlipCategory]]);

function candidate(over: Partial<SlipCandidate> = {}): SlipCandidate {
  return {
    id: "notification:1",
    assetId: "notification:1",
    source: "notification",
    isDuplicate: false,
    confidence: 90,
    bankId: "scb",
    bankName: "SCB",
    amount: 120,
    merchant: "7-Eleven",
    ...over,
  };
}

describe("isHighConfidenceNotification", () => {
  it("accepts a known bank + amount + previously categorised recipient", () => {
    expect(isHighConfidenceNotification(candidate(), learned)).toBe(true);
  });

  it("rejects an unknown bank, missing amount, or missing recipient", () => {
    expect(isHighConfidenceNotification(candidate({ bankId: undefined }), learned)).toBe(false);
    expect(isHighConfidenceNotification(candidate({ amount: undefined }), learned)).toBe(false);
    expect(isHighConfidenceNotification(candidate({ merchant: undefined }), learned)).toBe(false);
  });

  it("rejects a recipient the person has never categorised", () => {
    expect(isHighConfidenceNotification(candidate({ merchant: "Somebody New" }), learned)).toBe(false);
  });

  it("only applies to notification candidates", () => {
    expect(isHighConfidenceNotification(candidate({ source: "qr" }), learned)).toBe(false);
  });
});
