import { describe, expect, it } from "vitest";

import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";

import { validateSlip } from "./slipValidationEngine";

const emvco = (over: Partial<EmvcoPayload> = {}): EmvcoPayload => ({
  raw: "x",
  crcValid: true,
  merchantAccounts: [],
  referenceIds: ["REF123"],
  amount: 120,
  merchantName: "TEST SHOP",
  promptPay: { aid: "A000000677010111", proxyType: "msisdn", proxyValue: "0066812345678" },
  ...over,
});

const today = () => "2026-01-01";

describe("validateSlip", () => {
  it("fully validates a clean PromptPay slip with high confidence", () => {
    const report = validateSlip({ payload: emvco(), date: "2025-12-30", time: "14:30", today });
    expect(report.emvcoValid).toBe(true);
    expect(report.isPromptPay).toBe(true);
    expect(report.amount.valid).toBe(true);
    expect(report.reference.valid).toBe(true);
    expect(report.merchant.valid).toBe(true);
    expect(report.timestamp.valid).toBe(true);
    expect(report.confidence).toBe(100);
    expect(report.valid).toBe(true);
  });

  it("flags a CRC-invalid payload and lowers confidence", () => {
    const report = validateSlip({ payload: emvco({ crcValid: false }), date: "2025-12-30", today });
    expect(report.emvcoValid).toBe(false);
    expect(report.valid).toBe(false); // payload present but not CRC-valid
    expect(report.confidence).toBeLessThan(100);
  });

  it("validates amount, reference and merchant formats", () => {
    const report = validateSlip({
      payload: emvco({ amount: -5, referenceIds: ["bad ref!"], merchantName: "x".repeat(40) }),
      today,
    });
    expect(report.amount.issues).toContain("non-positive");
    expect(report.reference.issues).toContain("bad-format");
    expect(report.merchant.issues).toContain("too-long");
  });

  it("rejects a future or malformed timestamp", () => {
    expect(validateSlip({ payload: emvco(), date: "2999-01-01", today }).timestamp.issues).toContain("in-future");
    expect(validateSlip({ payload: emvco(), date: "12/30/2025", today }).timestamp.issues).toContain("bad-format");
  });

  it("validates an OCR-only slip (no payload) from provided fields", () => {
    const report = validateSlip({ payload: null, amount: 89, merchant: "OCR SHOP", reference: "OCR123", date: "2025-12-30", today });
    expect(report.emvcoValid).toBe(false);
    expect(report.amount.valid).toBe(true);
    expect(report.valid).toBe(true); // OCR slip with a valid amount is importable
  });
});
