import { describe, expect, it } from "vitest";

import { detectFraud } from "./fraudDetection";

describe("detectFraud", () => {
  it("rates a clean slip as low risk with no reasons", () => {
    expect(detectFraud({ crcValid: true, duplicateProbability: 0.1, timestampInFuture: false })).toEqual({
      level: "low",
      score: 0,
      reasons: [],
    });
  });

  it("rates an invalid payload + OCR mismatch as high risk", () => {
    const result = detectFraud({ crcValid: false, amountMismatch: true });
    expect(result.reasons).toEqual(["invalid-payload", "suspicious-ocr-mismatch"]);
    expect(result.score).toBe(60);
    expect(result.level).toBe("high");
  });

  it("flags duplicate reuse as medium risk", () => {
    const result = detectFraud({ crcValid: true, duplicateProbability: 0.9 });
    expect(result.reasons).toContain("duplicate-reuse");
    expect(result.level).toBe("medium");
  });

  it("flags an impossible timestamp and a screenshot", () => {
    const result = detectFraud({ timestampInFuture: true, isScreenshot: true });
    expect(result.reasons).toEqual(["impossible-timestamp", "fake-screenshot"]);
  });

  it("adds an edited-slip reason when verification risk is high", () => {
    expect(detectFraud({ verificationRisk: 70 }).reasons).toContain("edited-slip");
  });

  it("caps the score at 100", () => {
    const result = detectFraud({
      crcValid: false,
      amountMismatch: true,
      duplicateProbability: 0.9,
      timestampInFuture: true,
      verificationRisk: 80,
      isScreenshot: true,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("high");
  });
});
