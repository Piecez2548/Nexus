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
});
