import { describe, expect, it } from "vitest";

import { verifySlip } from "./slipVerification";

describe("verifySlip", () => {
  it("scores a consistent, CRC-valid slip as authentic and low-risk", () => {
    const scores = verifySlip({
      qr: { amount: 120, merchant: "Coffee", reference: "REF1" },
      ocr: { amount: 120, merchant: "coffee", reference: "ref-1" },
      crcValid: true,
      bankIdentified: true,
      timestampValid: true,
    });
    expect(scores.risk).toBe(0);
    expect(scores.authenticity).toBe(100);
    expect(scores.reasons).toEqual([]);
    expect(scores.confidence).toBeGreaterThanOrEqual(80);
  });

  it("raises risk and lists a reason on an amount mismatch", () => {
    const scores = verifySlip({ qr: { amount: 120 }, ocr: { amount: 999 }, crcValid: true });
    expect(scores.reasons).toContain("amount-mismatch");
    expect(scores.risk).toBeGreaterThanOrEqual(30);
    expect(scores.authenticity).toBeLessThan(100);
  });

  it("flags a CRC-invalid payload as high risk", () => {
    const scores = verifySlip({ qr: { amount: 120 }, ocr: { amount: 120 }, crcValid: false });
    expect(scores.reasons).toContain("crc-invalid");
    expect(scores.risk).toBeGreaterThanOrEqual(40);
  });

  it("does not penalise fields that only one side has", () => {
    const scores = verifySlip({ qr: { amount: 120 }, ocr: {}, crcValid: true });
    expect(scores.reasons).toEqual([]);
    expect(scores.risk).toBe(0);
  });
});
