import { describe, expect, it } from "vitest";

import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";

import type { OcrTextRecognizer } from "./ocrRecognizer";
import { runOcrFallback, shouldRunOcrFallback } from "./ocrFallback";

const emvco = (crcValid: boolean): EmvcoPayload => ({
  raw: "",
  crcValid,
  merchantAccounts: [],
  referenceIds: [],
});

describe("shouldRunOcrFallback", () => {
  it("runs OCR when no QR was detected (missing/unreadable)", () => {
    expect(shouldRunOcrFallback({ hasQr: false, emvco: null })).toBe(true);
  });

  it("runs OCR when a QR decoded but isn't a valid EMVCo payload (damaged/foreign)", () => {
    expect(shouldRunOcrFallback({ hasQr: true, emvco: null })).toBe(true);
  });

  it("runs OCR when the EMVCo checksum fails (corrupted)", () => {
    expect(shouldRunOcrFallback({ hasQr: true, emvco: emvco(false) })).toBe(true);
  });

  it("skips OCR when the QR yielded a clean, CRC-valid payload", () => {
    expect(shouldRunOcrFallback({ hasQr: true, emvco: emvco(true) })).toBe(false);
  });
});

describe("runOcrFallback", () => {
  it("recognises text via the injected recognizer and extracts slip fields", async () => {
    const fakeRecognizer: OcrTextRecognizer = {
      async recognize(): Promise<string> {
        return "จำนวน 500.00 บาท\nเวลา 08:15 น.";
      },
    };
    const fields = await runOcrFallback(new Uint8Array([1, 2, 3]), fakeRecognizer);
    expect(fields.amount).toBe(500);
    expect(fields.time).toBe("08:15");
  });

  it("keeps the first pass and does not retry when it already found the amount", async () => {
    let calls = 0;
    const recognizer: OcrTextRecognizer = {
      async recognize(): Promise<string> {
        calls += 1;
        return "จำนวน 47.00 บาท";
      },
    };
    const fields = await runOcrFallback(new Uint8Array([1, 2, 3]), recognizer);
    expect(fields.amount).toBe(47);
    expect(calls).toBe(1);
  });

  it("retries once on a plain binarised image when the first pass finds no amount", async () => {
    const texts = ["ชำระเงินสำเร็จ\n13 พ.ย. 69 11:33 น.\nจำนวน: ฒ@ฒ8", "จำนวน:\n47.00 บาท\nค่าธรรมเนียม:\n0.00 บาท"];
    let calls = 0;
    const recognizer: OcrTextRecognizer = {
      async recognize(): Promise<string> {
        return texts[calls++]!;
      },
    };
    const fields = await runOcrFallback(new Uint8Array([1, 2, 3]), recognizer);
    expect(calls).toBe(2);
    expect(fields.amount).toBe(47);
    expect(fields.text).toBe(texts[1]);
  });

  it("keeps the first pass when the retry finds no amount either", async () => {
    const texts = ["เวลา 08:15 น.", "random photo text"];
    let calls = 0;
    const recognizer: OcrTextRecognizer = {
      async recognize(): Promise<string> {
        return texts[calls++]!;
      },
    };
    const fields = await runOcrFallback(new Uint8Array([1, 2, 3]), recognizer);
    expect(calls).toBe(2);
    expect(fields.amount).toBeUndefined();
    expect(fields.time).toBe("08:15");
    expect(fields.text).toBe(texts[0]);
  });
});
