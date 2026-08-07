import { describe, expect, it } from "vitest";

import type { BankIdentification } from "@/features/finance/slipScanner/engine/bank/bankTypes";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import type { OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

import { basicConfidence, buildSlipCandidate } from "./slipCandidate";

const bank: BankIdentification = {
  bank: { id: "scb", code: "014", name: "Siam Commercial Bank", shortName: "SCB" },
  matchedBy: "promptPayAid",
};

const emvco = (crcValid: boolean): EmvcoPayload => ({
  raw: "000201...PAYLOAD",
  crcValid,
  merchantAccounts: [],
  referenceIds: ["REF999"],
  amount: 250,
  currency: "THB",
  merchantName: "QR MERCHANT",
});

const ocr: OcrSlipFields = {
  amount: 100,
  date: "2024-05-12",
  time: "14:30",
  merchant: "OCR MERCHANT",
  reference: "OCRREF",
};

describe("buildSlipCandidate", () => {
  it("prefers a valid QR's fields and marks the source qr", () => {
    const candidate = buildSlipCandidate({ assetId: "a1", emvco: emvco(true), bank, ocr });
    expect(candidate.source).toBe("qr");
    expect(candidate.amount).toBe(250);
    expect(candidate.currency).toBe("THB");
    expect(candidate.merchant).toBe("QR MERCHANT");
    expect(candidate.reference).toBe("REF999");
    expect(candidate.date).toBe("2024-05-12"); // date always from OCR (EMVCo has none)
    expect(candidate.time).toBe("14:30");
    expect(candidate.bankName).toBe("SCB");
    expect(candidate.payload).toBe("000201...PAYLOAD");
    expect(candidate.confidence).toBe(100);
  });

  it("falls back to OCR entirely when the QR checksum is invalid", () => {
    const candidate = buildSlipCandidate({ assetId: "a2", emvco: emvco(false), ocr });
    expect(candidate.source).toBe("ocr");
    expect(candidate.amount).toBe(100); // OCR, not the corrupted QR's 250
    expect(candidate.merchant).toBe("OCR MERCHANT");
    expect(candidate.currency).toBeUndefined();
    expect(candidate.payload).toBe("000201...PAYLOAD"); // raw still kept for reference
  });

  it("builds an OCR-only candidate when there is no QR", () => {
    const candidate = buildSlipCandidate({ assetId: "a3", ocr, isDuplicate: true });
    expect(candidate.source).toBe("ocr");
    expect(candidate.amount).toBe(100);
    expect(candidate.payload).toBeNull();
    expect(candidate.isDuplicate).toBe(true);
    expect(candidate.bankId).toBeUndefined();
  });
});

describe("basicConfidence", () => {
  it("scores a full, CRC-valid QR at 100 and an empty OCR slip low", () => {
    expect(
      basicConfidence({ source: "qr", crcValid: true, amount: 1, date: "d", merchant: "m", reference: "r", bankId: "b" }),
    ).toBe(100);
    expect(basicConfidence({ source: "ocr", crcValid: false })).toBe(10);
  });
});
