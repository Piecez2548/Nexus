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

  it("extracts a shop-name merchant from a label-less slip (KBank bill layout)", () => {
    const text = [
      "จ่ายบิลสำเร็จ",
      "นาย ภัทรพล ข",
      "ธ.กสิกรไทย",
      "SCB มณี SHOP (ร้านริญญ์น้ำ)",
      "014000008031056",
      "จำนวน 20.00 บาท",
    ].join("\n");
    const result = parseSlipText(text);
    expect(result.recipient).toBe("SCB มณี SHOP (ร้านริญญ์น้ำ)");
    expect(result.amount).toBe(20);
  });

  it("extracts the payee positionally on a label-less e-wallet top-up slip (K+ G-Wallet)", () => {
    // No ร้าน/SHOP marker; the payee is the name line after the payer's account.
    const text = [
      "เติมเงินสำเร็จ",
      "8 ส.ค. 69 18:27 น.",
      "นาย ภัทรพล ข",
      "ธ.กสิกรไทย",
      "xxx-x-x5327-x",
      "พร้อมเพย์ อี-วอลเล็ต / G-Wallet",
      "006-xxxxxxxx-6996",
      "เลขที่รายการ 016220182730CPM19695",
      "จำนวน 200.00 บาท",
      "ค่าธรรมเนียม 0.00 บาท",
    ].join("\n");
    const result = parseSlipText(text);
    expect(result.recipient).toBe("พร้อมเพย์ อี-วอลเล็ต / G-Wallet");
    expect(result.amount).toBe(200);
    expect(result.date).toBe("2026-08-08");
    expect(result.title).toBe("โอนเงินให้ พร้อมเพย์ อี-วอลเล็ต / G-Wallet");
  });

  it("skips the payee's own bank-label line and picks their name instead", () => {
    const text = [
      "โอนเงินสำเร็จ",
      "นายสมชาย ใจดี",
      "ธ.กสิกรไทย",
      "xxx-x-x5327-x",
      "ธ.ไทยพาณิชย์",
      "สมหญิง รักดี",
      "จำนวน 300.00 บาท",
    ].join("\n");
    expect(parseSlipText(text).recipient).toBe("สมหญิง รักดี");
  });

  it("does not fabricate a date from digits inside a masked account/reference number", () => {
    const text = "โอนเงินสำเร็จ\nxxx-x-x5327-x 006-2-34567-6996\nจำนวน 50.00 บาท";
    expect(parseSlipText(text).date).toBeUndefined();
    expect(parseSlipText(text).amount).toBe(50);
  });

  it("recognises an account line with a short leading label (e.g. 'A/C:')", () => {
    const text = [
      "โอนเงินสำเร็จ",
      "นายสมชาย ใจดี",
      "ธ.กสิกรไทย",
      "A/C: xxx-x-x5327-x",
      "สมหญิง รักดี",
      "จำนวน 150.00 บาท",
    ].join("\n");
    expect(parseSlipText(text).recipient).toBe("สมหญิง รักดี");
  });

  it("does not skip a real name that merely contains an amount-label word ('ยอด')", () => {
    const text = [
      "โอนเงินสำเร็จ",
      "นายสมชาย ใจดี",
      "ธ.กสิกรไทย",
      "xxx-x-x5327-x",
      "ยอดรัก คงยิ่งยง",
      "จำนวน 100.00 บาท",
    ].join("\n");
    expect(parseSlipText(text).recipient).toBe("ยอดรัก คงยิ่งยง");
  });

  it("does not anchor the positional scan to a non-account labelled digit line (e.g. a phone number)", () => {
    const text = [
      "โอนเงินสำเร็จ",
      "โทร: 0812345678",
      "นายสมชาย ใจดี",
      "ธ.กสิกรไทย",
      "xxx-x-x5327-x",
      "สมหญิง รักดี",
      "จำนวน 100.00 บาท",
    ].join("\n");
    expect(parseSlipText(text).recipient).toBe("สมหญิง รักดี");
  });

  it("skips the zero fee line when OCR garbles the amount's currency marker (K PLUS)", () => {
    const text = ["โอนเงินสำเร็จ", "11 พ.ย. 69 07:27 น.", "จํานวน:", "1,300.00 นบาท", "ค่าธรรมเนียม:", "0.00 บาท"].join("\n");
    expect(parseSlipText(text).amount).toBe(1300);
  });

  it("reads the amount label when OCR splits SARA AM into two code points", () => {
    // NIKHAHIT + SARA AA (U+0E4D U+0E32) instead of SARA AM (U+0E33) in "จำนวน".
    const text = ["ยอดคงเหลือ 9,999.00", "จํานวน: 47.00 บาท"].join("\n");
    expect(parseSlipText(text).amount).toBe(47);
  });

  it("does not guess an OCR-noise number when the only currency-marked amount is the zero fee", () => {
    const text = ["อาหารตามสั่ง 1.05 551", "จํานวน: . ว 0", "ค่าธรรมเนียม 0.00 บาท"].join("\n");
    expect(parseSlipText(text).amount).toBeUndefined();
  });

  it("never returns a zero amount", () => {
    expect(parseSlipText("ค่าธรรมเนียม 0.00 บาท").amount).toBeUndefined();
  });

  it.each([
    ["11พ.ย.69 07:27น.", "2026-11-11"],
    ["12 พ.ย 69 09:58 น.", "2026-11-12"],
    ["12พุย.69 09:58 น.", "2026-11-12"],
    ["3 ม.ค, 2569", "2026-01-03"],
  ])("reads an OCR-mangled abbreviated Thai month (%s)", (line, expected) => {
    expect(parseSlipText(line).date).toBe(expected);
  });

  it("rejects an impossible day in a Thai-month date", () => {
    expect(parseSlipText("45 พ.ย. 69").date).toBeUndefined();
  });

  // K PLUS slips as Tesseract reads them on the phone (names made up): icon
  // noise before the account and name lines, "%" for the masking x, and the
  // amount label alone on its own line.
  it("takes the payee after a noisy K PLUS account line, not the amount label", () => {
    const transfer = [
      "-- โอนเงินสําเร็จ IK",
      "C7 ไ11พ.ย.69 07:27 w. +",
      "นาย สมชาย ใ",
      "ธ.กสิกรไทย",
      "J   XXX-X-X1234-%",
      "Qs              [3",
      "69  นาย มานะ ใจดี",
      "ธ.กสิกรไทย",
      "XXX-X-X5678-x",
      "จํานวน:",
      "1,300.00 um",
    ].join("\n");
    expect(parseSlipText(transfer).recipient).toBe("นาย มานะ ใจดี");

    const payment = [
      "ง   %%%-%-%1234-%",
      "ซู ร้านอาหารตามสั่ง/ชาบู",
      "นาย มานะ ใจดี",
      "202611133172554",
      "จ้านวน:",
      "40.00 บาท",
    ].join("\n");
    expect(parseSlipText(payment).recipient).toBe("ร้านอาหารตามสั่ง/ชาบู");

    const bill = ["ง   XXX-X-X1234-x", "oO  Fried Chicken Shop", "006000003194284", "จํานวน:", "75.00 บาท"].join("\n");
    expect(parseSlipText(bill).recipient).toBe("Fried Chicken Shop");
  });

  it("keeps a title and a real short word at the start of a name", () => {
    expect(parseSlipText(["XXX-X-X1234-x", "Mr John Smith"].join("\n")).recipient).toBe("Mr John Smith");
  });

  it("does not read an amount out of a longer number", () => {
    expect(parseSlipText("0 0.0163171133100ด04431 ตรวจสอบสลิป").amount).toBeUndefined();
  });
});
