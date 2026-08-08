import { describe, expect, it } from "vitest";
import { parseSlipText } from "./slipParser";

describe("parseSlipText", () => {
  it("extracts amount, date, and recipient from a typical SCB-style slip", () => {
    const text = `
      SCB โอนเงินสำเร็จ
      22/07/2569 14:35
      โอนไปยัง นายสมชาย ใจดี
      จำนวนเงิน
      1,500.00 บาท
      เลขที่รายการ 00123456789
    `;

    const result = parseSlipText(text);

    expect(result.amount).toBe(1500);
    expect(result.date).toBe("2026-07-22");
    expect(result.recipient).toBe("นายสมชาย ใจดี");
    expect(result.title).toBe("โอนเงินให้ นายสมชาย ใจดี");
  });

  it("parses a Thai long-form date with month name", () => {
    const text = "โอนเงินสำเร็จ วันที่ 5 สิงหาคม 2569 เวลา 09:12\nจำนวน 250.50 บาท";

    const result = parseSlipText(text);

    expect(result.date).toBe("2026-08-05");
    expect(result.amount).toBe(250.5);
  });

  it("converts a 2-digit Buddhist year", () => {
    const text = "22/07/69\nถึง ร้านกาแฟ\n80.00 บาท";

    const result = parseSlipText(text);

    expect(result.date).toBe("2026-07-22");
    expect(result.recipient).toBe("ร้านกาแฟ");
  });

  it("returns undefined fields when nothing matches", () => {
    const result = parseSlipText("unreadable garbled text ###");

    expect(result.amount).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.recipient).toBeUndefined();
    expect(result.title).toBeUndefined();
  });

  it("ignores an account-number-like string with no decimal point as the amount", () => {
    const text = "เลขบัญชี 1234567890\nจำนวนเงิน 99.00 บาท";

    const result = parseSlipText(text);

    expect(result.amount).toBe(99);
  });

  it("picks the currency-anchored amount, not an earlier decimal number", () => {
    // A balance/other number appears first; the real amount is next to บาท.
    const text = "ยอดคงเหลือ 5,520.00\nจำนวนเงิน 20.00 บาท\nเลขที่รายการ 015520";
    expect(parseSlipText(text).amount).toBe(20);
  });

  it("reads an amount marked with the ฿ symbol", () => {
    expect(parseSlipText("โอนสำเร็จ ฿20.00").amount).toBe(20);
  });
});
