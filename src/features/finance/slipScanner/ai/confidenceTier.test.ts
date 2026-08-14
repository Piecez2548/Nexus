import { describe, expect, it } from "vitest";

import { confidenceTier, isAutoImportEligible } from "./confidenceTier";

describe("confidenceTier", () => {
  it("is critical whenever the amount is missing or non-positive, regardless of confidence", () => {
    expect(confidenceTier({ confidence: 100, amount: undefined })).toBe("critical");
    expect(confidenceTier({ confidence: 100, amount: 0 })).toBe("critical");
    expect(confidenceTier({ confidence: 100, amount: -5 })).toBe("critical");
  });

  it("is high at or above the high threshold", () => {
    expect(confidenceTier({ confidence: 85, amount: 10 })).toBe("high");
    expect(confidenceTier({ confidence: 100, amount: 10 })).toBe("high");
  });

  it("is medium between the medium and high thresholds", () => {
    expect(confidenceTier({ confidence: 60, amount: 10 })).toBe("medium");
    expect(confidenceTier({ confidence: 84, amount: 10 })).toBe("medium");
  });

  it("is low below the medium threshold", () => {
    expect(confidenceTier({ confidence: 0, amount: 10 })).toBe("low");
    expect(confidenceTier({ confidence: 59, amount: 10 })).toBe("low");
  });
});

describe("isAutoImportEligible", () => {
  it("is true only for a high-tier, non-duplicate candidate", () => {
    expect(isAutoImportEligible({ confidence: 90, amount: 10, isDuplicate: false })).toBe(true);
  });

  it("is false for a high-tier candidate that is flagged as a duplicate", () => {
    expect(isAutoImportEligible({ confidence: 90, amount: 10, isDuplicate: true })).toBe(false);
  });

  it("is false for a medium or low tier candidate even when not a duplicate", () => {
    expect(isAutoImportEligible({ confidence: 70, amount: 10, isDuplicate: false })).toBe(false);
    expect(isAutoImportEligible({ confidence: 10, amount: 10, isDuplicate: false })).toBe(false);
  });

  it("is false for a critical (missing-amount) candidate even at high confidence", () => {
    expect(isAutoImportEligible({ confidence: 100, amount: undefined, isDuplicate: false })).toBe(false);
  });
});
