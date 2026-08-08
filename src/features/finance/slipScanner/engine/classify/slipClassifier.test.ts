import { describe, expect, it } from "vitest";

import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";

import { classifySlip } from "./slipClassifier";

const emvco = (aid: string, over: Partial<EmvcoPayload> = {}): EmvcoPayload => ({
  raw: "x",
  crcValid: true,
  merchantAccounts: [],
  referenceIds: [],
  promptPay: { aid },
  ...over,
});

describe("classifySlip", () => {
  it("classifies a PromptPay credit-transfer QR", () => {
    expect(classifySlip({ emvco: emvco("A000000677010111") }).type).toBe("promptpay");
  });

  it("classifies a PromptPay bill-payment QR", () => {
    const r = classifySlip({ emvco: emvco("A000000677010112") });
    expect(r.type).toBe("bill-payment");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("classifies deposit / withdrawal / transfer / bill from OCR keywords", () => {
    expect(classifySlip({ text: "ฝากเงินสด 500 บาท" }).type).toBe("deposit");
    expect(classifySlip({ text: "ถอนเงิน 300" }).type).toBe("withdrawal");
    expect(classifySlip({ text: "โอนเงินให้ นายสมชาย" }).type).toBe("transfer");
    expect(classifySlip({ text: "ชำระเงินค่าไฟ" }).type).toBe("bill-payment");
  });

  it("falls back to bank-slip when only a bank is known", () => {
    expect(classifySlip({ bankId: "scb" }).type).toBe("bank-slip");
  });

  it("returns unknown when nothing matches", () => {
    expect(classifySlip({ text: "random photo" })).toEqual({ type: "unknown", confidence: 0 });
  });
});
