import { describe, expect, it } from "vitest";

import { combineConfidence } from "./confidenceEngine";

describe("combineConfidence", () => {
  it("weights all present signals into one score", () => {
    const result = combineConfidence({ qr: 1, parser: 1, ocr: 1, aiValidation: 1, bankTemplate: 1 });
    expect(result.score).toBe(100);
  });

  it("renormalises over only the signals present", () => {
    // Only qr (0.3) and ocr (0.2) present; both = 0.5 → score 50 regardless of absent weights.
    const result = combineConfidence({ qr: 0.5, ocr: 0.5 });
    expect(result.score).toBe(50);
    expect(Object.keys(result.breakdown)).toEqual(["qr", "ocr"]);
  });

  it("weights a strong QR over weak OCR", () => {
    // qr 1.0 (0.3), ocr 0.0 (0.2) → (0.3)/(0.5) = 0.6 → 60
    expect(combineConfidence({ qr: 1, ocr: 0 }).score).toBe(60);
  });

  it("clamps inputs and returns 0 when no signals are present", () => {
    expect(combineConfidence({ qr: 5 }).score).toBe(100); // clamped to 1
    expect(combineConfidence({}).score).toBe(0);
  });
});
