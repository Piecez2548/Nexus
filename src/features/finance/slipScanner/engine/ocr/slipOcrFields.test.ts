import { describe, expect, it } from "vitest";

import { extractOcrSlipFields } from "./slipOcrFields";

const SAMPLE_SLIP = [
  "โอนเงินสำเร็จ",
  "ไปยัง นายสมชาย ใจดี",
  "จำนวน 1,234.56 บาท",
  "วันที่ 12/05/2567 เวลา 14:30 น.",
  "เลขที่รายการ 015234567890123",
].join("\n");

describe("extractOcrSlipFields", () => {
  it("reuses parseSlipText for amount, date and merchant", () => {
    const fields = extractOcrSlipFields(SAMPLE_SLIP);
    expect(fields.amount).toBe(1234.56);
    expect(fields.date).toBe("2024-05-12"); // Buddhist 2567 -> Gregorian 2024
    expect(fields.merchant).toBe("นายสมชาย ใจดี");
  });

  it("adds transaction time (HH:MM)", () => {
    expect(extractOcrSlipFields(SAMPLE_SLIP).time).toBe("14:30");
  });

  it("adds seconds when present", () => {
    expect(extractOcrSlipFields("เวลา 09:05:07").time).toBe("09:05:07");
  });

  it("rejects an out-of-range time", () => {
    expect(extractOcrSlipFields("รหัส 25:99").time).toBeUndefined();
  });

  it("extracts the reference number after a Thai label", () => {
    expect(extractOcrSlipFields(SAMPLE_SLIP).reference).toBe("015234567890123");
  });

  it("extracts the reference number after an English label", () => {
    expect(extractOcrSlipFields("Ref No: ABC1234567").reference).toBe("ABC1234567");
    expect(extractOcrSlipFields("Reference ID 987654321").reference).toBe("987654321");
  });

  it("leaves fields undefined when the text carries no such data", () => {
    const fields = extractOcrSlipFields("just some unrelated text");
    expect(fields.amount).toBeUndefined();
    expect(fields.time).toBeUndefined();
    expect(fields.reference).toBeUndefined();
    expect(fields.merchant).toBeUndefined();
  });
});
