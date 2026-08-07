import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { tesseractOcrRecognizer, type OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import { extractOcrSlipFields, type OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

// The QR stage's outcome for one slip: whether a QR was found, and the parsed
// EMVCo payload if it decoded to one.
export interface QrOutcome {
  hasQr: boolean;
  emvco: EmvcoPayload | null;
}

// OCR is a fallback, not the primary path: it runs ONLY when the QR can't carry
// the data. That is the case when the QR is missing/unreadable (no QR
// detected), when a detected QR isn't a valid EMVCo payload (damaged/foreign),
// or when its checksum fails (corrupted). A clean, CRC-valid EMVCo payload
// needs no OCR.
export function shouldRunOcrFallback(qr: QrOutcome): boolean {
  if (!qr.hasQr) return true;
  if (qr.emvco === null) return true;
  return !qr.emvco.crcValid;
}

// Recognise a slip's text (reusing the app's Tesseract OCR by default) and
// extract the amount/date/time/reference/merchant fields. Callers gate this on
// `shouldRunOcrFallback` so the expensive OCR pass is skipped for slips whose
// QR already yielded a usable payload.
export async function runOcrFallback(
  bytes: Uint8Array,
  recognizer: OcrTextRecognizer = tesseractOcrRecognizer,
): Promise<OcrSlipFields> {
  const text = await recognizer.recognize(bytes);
  return extractOcrSlipFields(text);
}
