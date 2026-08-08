import { describe, expect, it } from "vitest";

import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";
import type { OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import { createQrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";

import { extractSlipCandidate } from "./extractSlipCandidate";

function withCrc(body: string): string {
  const marked = body + "6304";
  return marked + crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
}

const PROMPTPAY_QR = withCrc(
  "000201010211" +
    "29370016A00000067701011101130066812345678" +
    "5303764" +
    "5406120.00" +
    "5802TH" +
    "5909TEST SHOP" +
    "62090505REF77",
);

const qrDecoder = (payload: string | null): QrDecoder => ({ async decode() { return payload; } });
const ocrRecognizer = (text: string): OcrTextRecognizer => ({ async recognize() { return text; } });

describe("extractSlipCandidate", () => {
  it("builds a QR candidate via the EMVCo path and identifies the rail", async () => {
    const candidate = await extractSlipCandidate({
      assetId: "slip1",
      bytes: new Uint8Array([1]),
      thumbnailUrl: "blob:thumb",
      detector: createQrDetector(qrDecoder(PROMPTPAY_QR)),
      recognizer: ocrRecognizer(""),
    });

    expect(candidate.source).toBe("qr");
    expect(candidate.amount).toBe(120);
    expect(candidate.merchant).toBe("TEST SHOP");
    expect(candidate.reference).toBe("REF77");
    expect(candidate.bankId).toBe("promptpay");
    expect(candidate.thumbnailUrl).toBe("blob:thumb");
  });

  it("falls back to OCR when no QR is present", async () => {
    const candidate = await extractSlipCandidate({
      assetId: "photo1",
      bytes: new Uint8Array([0]),
      detector: createQrDetector(qrDecoder(null)),
      recognizer: ocrRecognizer("จำนวน 89.00 บาท\nเวลา 10:15 น."),
    });

    expect(candidate.source).toBe("ocr");
    expect(candidate.amount).toBe(89);
    expect(candidate.time).toBe("10:15");
  });
});
