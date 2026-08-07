import { describe, expect, it } from "vitest";

import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { detectCandidateTamper, detectPayloadTamper, isReplayedSlip } from "./tamperDetection";

const emvco = (crcValid: boolean): EmvcoPayload => ({
  raw: "",
  crcValid,
  merchantAccounts: [],
  referenceIds: [],
});

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  ...over,
});

describe("detectPayloadTamper", () => {
  it("flags a CRC mismatch as tampered", () => {
    expect(detectPayloadTamper(emvco(false))).toEqual({ tampered: true, reasons: ["crc-mismatch"] });
  });

  it("passes a CRC-valid payload", () => {
    expect(detectPayloadTamper(emvco(true))).toEqual({ tampered: false, reasons: [] });
  });
});

describe("isReplayedSlip", () => {
  it("is true only for a duplicate QR slip", () => {
    expect(isReplayedSlip(candidate({ source: "qr", isDuplicate: true }))).toBe(true);
    expect(isReplayedSlip(candidate({ source: "ocr", isDuplicate: true }))).toBe(false);
    expect(isReplayedSlip(candidate({ source: "qr", isDuplicate: false }))).toBe(false);
  });
});

describe("detectCandidateTamper", () => {
  it("flags a possible replay and a non-positive amount", () => {
    const result = detectCandidateTamper(candidate({ isDuplicate: true, amount: 0 }));
    expect(result.tampered).toBe(true);
    expect(result.reasons).toEqual(["possible-replay", "non-positive-amount"]);
  });

  it("passes a clean candidate", () => {
    expect(detectCandidateTamper(candidate({ amount: 100 }))).toEqual({ tampered: false, reasons: [] });
  });
});
