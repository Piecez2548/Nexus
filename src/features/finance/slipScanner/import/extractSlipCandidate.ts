import { identifyBank } from "@/features/finance/slipScanner/engine/bank/bankIdentifier";
import { parseEmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { shouldRunOcrFallback, runOcrFallback } from "@/features/finance/slipScanner/engine/ocr/ocrFallback";
import type { OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
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
// stages together (the composition previously only exercised in the GS-021
// integration test): QR detect → EMVCo parse → bank identify → OCR fallback
// (only when the QR is missing/damaged) → candidate build. Used by the live
// scan flow; the engines it calls are the same tested units.
export async function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate> {
  const detector = input.detector ?? defaultQrDetector;

  const detection = await detector.detect(input.bytes);
  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  const bank = emvco ? identifyBank(emvco) : null;

  const qr = { hasQr: detection.hasQr, emvco };
  const ocr = shouldRunOcrFallback(qr) ? await runOcrFallback(input.bytes, input.recognizer) : null;

  return buildSlipCandidate({
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    emvco,
    bank,
    ocr,
  });
}
