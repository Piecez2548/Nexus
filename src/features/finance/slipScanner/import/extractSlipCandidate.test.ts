import { describe, expect, it } from "vitest";

import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";
import type { OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import { createQrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";

import { extractSlipCandidate, ScanCancelledError } from "./extractSlipCandidate";

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

  it("identifies the bank from OCR text when a clean, non-PromptPay EMVCo QR leaves the bank unresolved", async () => {
    // A real-bank merchant-presented QR: valid, CRC-correct, not PromptPay, and
    // with no registered plugin match for its GUID — identifyBank(emvco) alone
    // returns null for this. The OCR text (from the slip's bank logo/name)
    // should still resolve the bank without touching the QR-sourced amount.
    const NON_PROMPTPAY_QR = withCrc(
      "000201010211" +
        "29310010A00000099201130066812345678" +
        "5303764" +
        "5406120.00" +
        "5802TH" +
        "5909TEST SHOP" +
        "62090505REF77",
    );

    const candidate = await extractSlipCandidate({
      assetId: "slip3",
      bytes: new Uint8Array([1]),
      detector: createQrDetector(qrDecoder(NON_PROMPTPAY_QR)),
      recognizer: ocrRecognizer("ธนาคารกสิกรไทย\n22/07/2569 14:35\nจำนวนเงิน 120.00 บาท"),
    });

    expect(candidate.source).toBe("qr");
    expect(candidate.amount).toBe(120); // EMVCo wins for amount
    expect(candidate.merchant).toBe("TEST SHOP"); // EMVCo wins for merchant
    expect(candidate.bankId).toBe("kbank"); // resolved from OCR text
    // A CRC-valid EMVCo QR carries no date/time, so these come from OCR even
    // though OCR ran only to resolve the bank.
    expect(candidate.date).toBe("2026-07-22");
    expect(candidate.time).toBe("14:35");
  });

  it("identifies the bank from OCR text on a non-EMVCo (slip-verify) QR / OCR slip", async () => {
    const candidate = await extractSlipCandidate({
      assetId: "photo2",
      bytes: new Uint8Array([0]),
      detector: createQrDetector(qrDecoder(null)),
      recognizer: ocrRecognizer("ธนาคารกสิกรไทย\nจำนวนเงิน 20.00 บาท"),
    });

    expect(candidate.source).toBe("ocr");
    expect(candidate.amount).toBe(20);
    expect(candidate.bankId).toBe("kbank");
  });

  it("stops before attempting QR recovery when already cancelled, instead of running the full pipeline", async () => {
    let recoverCalled = false;
    await expect(
      extractSlipCandidate({
        assetId: "x",
        bytes: new Uint8Array([0]),
        detector: createQrDetector(qrDecoder(null)), // no QR -- would otherwise trigger recovery
        recognizer: ocrRecognizer("should never run"),
        recover: async () => {
          recoverCalled = true;
          return { payload: null, recoveredBy: null, attempts: 0 };
        },
        isCancelled: () => true,
      }),
    ).rejects.toThrow(ScanCancelledError);
    expect(recoverCalled).toBe(false);
  });

  it("survives OCR throwing (e.g. Tesseract unable to read a corrupt/unsupported image) instead of rejecting the whole extraction", async () => {
    const candidate = await extractSlipCandidate({
      assetId: "unreadable",
      bytes: new Uint8Array([0]),
      detector: createQrDetector(qrDecoder(null)), // no QR -- OCR fallback runs
      recognizer: {
        async recognize() {
          throw new Error("Error attempting to read image.");
        },
      },
    });

    // Still resolves to a candidate (no OCR data available) rather than
    // throwing -- one unreadable image in a gallery scan must not abort the
    // batch, matching the existing best-effort contract for QR recovery.
    expect(candidate.assetId).toBe("unreadable");
    expect(candidate.amount).toBeUndefined();
    expect(candidate.bankId).toBeUndefined();
  });

  it("skipOcrWhenNoQr: skips OCR entirely when neither detect nor recovery found any QR", async () => {
    let ocrCalled = false;
    const candidate = await extractSlipCandidate({
      assetId: "no-qr-photo",
      bytes: new Uint8Array([0]),
      detector: createQrDetector(qrDecoder(null)),
      recover: async () => ({ payload: null, recoveredBy: null, attempts: 6 }), // recovery also found nothing
      recognizer: {
        async recognize() {
          ocrCalled = true;
          return "should never run";
        },
      },
      skipOcrWhenNoQr: true,
    });

    expect(ocrCalled).toBe(false);
    expect(candidate.assetId).toBe("no-qr-photo");
    expect(candidate.amount).toBeUndefined();
  });

  it("skipOcrWhenNoQr: still runs OCR when a QR WAS found but isn't usable (damaged/non-EMVCo/CRC-invalid)", async () => {
    // A QR was detected (detection.hasQr === true) but it's not parseable
    // EMVCo -- shouldRunOcrFallback says OCR is still needed, and skipOcrWhenNoQr
    // only ever gates the "no QR at all" case, not "QR found but unusable".
    let ocrCalled = false;
    const candidate = await extractSlipCandidate({
      assetId: "damaged-qr-photo",
      bytes: new Uint8Array([1]),
      detector: createQrDetector(qrDecoder("not a valid emvco payload")),
      recognizer: {
        async recognize() {
          ocrCalled = true;
          return "จำนวน 40.00 บาท";
        },
      },
      skipOcrWhenNoQr: true,
    });

    expect(ocrCalled).toBe(true);
    expect(candidate.amount).toBe(40);
  });

  it("attempts QR recovery but stops before starting OCR once cancelled mid-extraction", async () => {
    let ocrCalled = false;
    let recoveryAttempted = false;
    await expect(
      extractSlipCandidate({
        assetId: "x",
        bytes: new Uint8Array([0]),
        detector: createQrDetector(qrDecoder(null)),
        recognizer: {
          async recognize() {
            ocrCalled = true;
            return "text";
          },
        },
        recover: async () => {
          recoveryAttempted = true;
          return { payload: null, recoveredBy: null, attempts: 3 };
        },
        // false during the pre-recovery check, true afterward -- cancellation
        // lands while recovery is already in flight, same as a real scan.
        isCancelled: () => recoveryAttempted,
      }),
    ).rejects.toThrow(ScanCancelledError);
    expect(recoveryAttempted).toBe(true);
    expect(ocrCalled).toBe(false);
  });
});
