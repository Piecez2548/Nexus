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

  it("picks the earliest-mentioned bank (payer at top) over one in later text", () => {
    // Real KBank bill slip: payer bank กสิกรไทย at top, merchant "SCB มณี SHOP" below.
    const slip = "จ่ายบิลสำเร็จ\nนาย ภัทรพล ข\nธ.กสิกรไทย\nSCB มณี SHOP (ร้านริญญ์น้ำ)\nSCB";
    expect(identifyBankFromText(slip)?.bank.id).toBe("kbank");
  });
});
