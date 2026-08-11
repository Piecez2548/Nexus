import { identifyBank } from "@/features/finance/slipScanner/engine/bank/bankIdentifier";
import { identifyBankFromText } from "@/features/finance/slipScanner/engine/bank/bankTextIdentifier";
import { parseEmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { runOcrFallback, shouldRunOcrFallback } from "@/features/finance/slipScanner/engine/ocr/ocrFallback";
import { tesseractOcrRecognizer, type OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import type { OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";
import { recoverQr, type QrRecoveryResult } from "@/features/finance/slipScanner/engine/qr/qrRecovery";
import { defaultQrDetector, type QrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import { buildSlipCandidate, type SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

export interface ExtractSlipInput {
  assetId: string;
  bytes: Uint8Array;
  thumbnailUrl?: string;
  // Overridable for tests; defaults use the real jsQR decoder + Tesseract OCR.
  detector?: QrDetector;
  recognizer?: OcrTextRecognizer;
  // QR Recovery Engine (GS-026), overridable for tests; defaults to the real
  // rotate/brighten/contrast/upscale retry decoder.
  recover?: (bytes: Uint8Array) => Promise<QrRecoveryResult>;
}

// The single "image bytes → SlipCandidate" entry point wiring the extraction
// stages together: QR detect (retrying transformed variants when the original
// yields no QR) → EMVCo parse → bank identify → OCR fallback (when the QR is
// missing/damaged/non-EMVCo, or a usable QR still left the bank unidentified)
// → candidate build. Bank comes from the EMVCo payload when present; otherwise
// it is identified from the OCR text (most real Thai completed slips carry a
// slip-verification QR, not an EMVCo payment QR, so the bank name on the slip
// is the reliable signal — this also covers a clean, CRC-valid EMVCo payload
// from a bank rail the identifier has no GUID/plugin match for).
export async function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate> {
  const detector = input.detector ?? defaultQrDetector;
  const recognizer = input.recognizer ?? tesseractOcrRecognizer;
  // The detect stage already tried the original bytes with the same decoder, so
  // recovery skips straight to transformed variants.
  const recover = input.recover ?? ((bytes: Uint8Array) => recoverQr(bytes, { skipOriginal: true }));

  let detection = await detector.detect(input.bytes);
  if (!detection.hasQr) {
    try {
      const recovery = await recover(input.bytes);
      if (recovery.payload !== null) detection = { hasQr: true, payload: recovery.payload };
    } catch {
      // Recovery is best-effort (canvas transforms can throw under memory
      // pressure); a failure must not abort the batch — fall through to OCR.
    }
  }

  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  let bank = emvco ? identifyBank(emvco) : null;

  let ocr: OcrSlipFields | null = null;
  const needsOcrFallback = shouldRunOcrFallback({ hasQr: detection.hasQr, emvco });
  if (needsOcrFallback || !bank) {
    const result = await runOcrFallback(input.bytes, recognizer);
    // Keep the OCR fields even when OCR ran only to resolve the bank: a
    // CRC-valid EMVCo QR carries no date/time, so these come from OCR
    // regardless (buildSlipCandidate still prefers EMVCo for amount/merchant).
    ocr = result;
    if (!bank) bank = identifyBankFromText(result.text);
  }

  return buildSlipCandidate({
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    emvco,
    bank,
    ocr,
  });
}
