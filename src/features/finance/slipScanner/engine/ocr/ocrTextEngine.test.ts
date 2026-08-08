import { describe, expect, it } from "vitest";

import { extractOcrText } from "./ocrTextEngine";

const SLIP = [
  "โอนเงินสำเร็จ",
  "จาก นายสมชาย ใจดี",
  "ไปยัง ร้านกาแฟ ABC",
  "จำนวน 120.00 บาท",
  "วันที่ 30/12/2567 เวลา 14:30 น.",
  "เลขที่รายการ TX0012345678",
].join("\n");

describe("extractOcrText", () => {
  it("extracts every field with a positive confidence", () => {
    const r = extractOcrText(SLIP);
    expect(r.amount.value).toBe(120);
    expect(r.date.value).toBe("2024-12-30");
    expect(r.time.value).toBe("14:30");
    expect(r.sender.value).toBe("นายสมชาย ใจดี");
    expect(r.receiver.value).toBe("ร้านกาแฟ ABC");
    expect(r.reference.value).toBe("TX0012345678");

    for (const key of ["amount", "date", "time", "sender", "receiver", "reference"] as const) {
      expect(r[key].confidence).toBeGreaterThan(0);
    }
  });

  it("scores absent fields at confidence 0", () => {
    const r = extractOcrText("random text with nothing useful");
    expect(r.amount.value).toBeUndefined();
    expect(r.amount.confidence).toBe(0);
    expect(r.sender.confidence).toBe(0);
    expect(r.reference.confidence).toBe(0);
  });
});
