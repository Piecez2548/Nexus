import { identifyBank } from "@/features/finance/slipScanner/engine/bank/bankIdentifier";
import { identifyBankFromText } from "@/features/finance/slipScanner/engine/bank/bankTextIdentifier";
import { parseEmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { preprocessForOcr } from "@/features/finance/slipScanner/engine/image/ocrPreprocess";
import { shouldRunOcrFallback } from "@/features/finance/slipScanner/engine/ocr/ocrFallback";
import { tesseractOcrRecognizer, type OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import { extractOcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";
import { defaultQrDetector, type QrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import { buildSlipCandidate, type SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

export interface ExtractSlipInput {
  assetId: string;
  bytes: Uint8Array;
  thumbnailUrl?: string;
  // Overridable for tests; defaults use the real jsQR decoder + Tesseract OCR.
  detector?: QrDetector;
  recognizer?: OcrTextRecognizer;
}

// The single "image bytes → SlipCandidate" entry point wiring the extraction
// stages together: QR detect → EMVCo parse → bank identify → OCR fallback
// (when the QR is missing/damaged/non-EMVCo) → candidate build. Bank comes from
// the EMVCo payload when present; otherwise it is identified from the OCR text
// (most real Thai completed slips carry a slip-verification QR, not an EMVCo
// payment QR, so the bank name on the slip is the reliable signal).
export async function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate> {
  const detector = input.detector ?? defaultQrDetector;
  const recognizer = input.recognizer ?? tesseractOcrRecognizer;

  const detection = await detector.detect(input.bytes);
  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  let bank = emvco ? identifyBank(emvco) : null;

  let ocr = null;
  if (shouldRunOcrFallback({ hasQr: detection.hasQr, emvco })) {
    // Preprocess for OCR (upscale + grayscale + Otsu binarisation) to strip
    // slip watermarks/coloured backgrounds so text is crisp; a no-op
    // off-browser or on failure.
    const prepared = await preprocessForOcr(input.bytes);
    const text = await recognizer.recognize(prepared);
    ocr = extractOcrSlipFields(text);
    if (!bank) bank = identifyBankFromText(text);
  }

  return buildSlipCandidate({
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    emvco,
    bank,
    ocr,
  });
}
