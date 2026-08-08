import { describe, expect, it } from "vitest";

import { identifyBankFromText } from "./bankTextIdentifier";

describe("identifyBankFromText", () => {
  it("identifies banks from Thai or English name keywords", () => {
    expect(identifyBankFromText("ธนาคารไทยพาณิชย์ โอนเงินสำเร็จ")?.bank.id).toBe("scb");
    expect(identifyBankFromText("KBank transfer success")?.bank.id).toBe("kbank");
    expect(identifyBankFromText("ธนาคารกสิกรไทย")?.bank.id).toBe("kbank");
    expect(identifyBankFromText("ธนาคารกรุงไทย")?.bank.id).toBe("ktb");
    expect(identifyBankFromText("Krungsri PromptPay")?.bank.id).toBe("bay");
    expect(identifyBankFromText("พร้อมเพย์")?.bank.id).toBe("promptpay");
  });

  it("reports the match source as ocrText", () => {
    expect(identifyBankFromText("SCB")?.matchedBy).toBe("ocrText");
  });

  it("returns null when no bank keyword is present", () => {
    expect(identifyBankFromText("random slip with no bank name")).toBeNull();
  });
});
