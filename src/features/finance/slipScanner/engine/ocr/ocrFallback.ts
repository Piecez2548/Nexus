import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { preprocessForOcr } from "@/features/finance/slipScanner/engine/image/ocrPreprocess";
import { tesseractOcrRecognizer, type OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import { extractOcrSlipFields, type OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

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

export interface OcrFallbackResult extends OcrSlipFields {
  // The recognised raw text, exposed so callers can also run bank-text
  // identification (identifyBankFromText) without re-recognising the image.
  text: string;
}

// Recognise a slip's text (reusing the app's Tesseract OCR by default) and
// extract the amount/date/time/reference/merchant fields. Preprocesses the
// image first (upscale + binarise) to beat watermarks/coloured backgrounds.
// Callers gate this on `shouldRunOcrFallback` so the expensive OCR pass is
// skipped for slips whose QR already yielded a usable payload.
export async function runOcrFallback(
  bytes: Uint8Array,
  recognizer: OcrTextRecognizer = tesseractOcrRecognizer,
): Promise<OcrFallbackResult> {
  const preprocessStart = perfNow();
  const prepared = await preprocessForOcr(bytes);
  const preprocessMs = perfNow() - preprocessStart;

  const recognizeStart = perfNow();
  const text = await recognizer.recognize(prepared);
  const recognizeMs = perfNow() - recognizeStart;

  const parseStart = perfNow();
  const fields = extractOcrSlipFields(text);
  const parseMs = perfNow() - parseStart;

  // TEMPORARY perf-investigation instrumentation (OCR bottleneck
  // investigation) -- the top-level split callers (extractSlipCandidate.ts)
  // already time as one "ocrMs" block; this breaks that block down into
  // preprocess vs the recognizer call vs field parsing. Remove once confirmed.
  console.debug(
    `[perf-investigation] runOcrFallback inputBytes=${bytes.length} preparedBytes=${prepared.length} preprocessMs=${Math.round(preprocessMs)} recognizeMs=${Math.round(recognizeMs)} parseMs=${Math.round(parseMs)} textLength=${text.length}`,
  );

  return { ...fields, text };
}
