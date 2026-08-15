import { getOcrWorkerPool } from "@/features/finance/slipScanner/engine/ocr/ocrWorkerPool";

// Byte-oriented OCR seam for the scanner engine. Detection/parsing logic
// depends on this interface, not on Tesseract, so the fallback is
// unit-testable with a fake recognizer and the heavy WASM engine stays out of
// the code path (and the bundle) until a slip actually needs OCR. The default
// routes through a small reused Tesseract worker pool (ocrWorkerPool.ts)
// rather than slipOcr.ts's recognizeSlipText, which spins up (and tears
// down) a fresh worker per call -- fine for the single-slip manual scanner
// this app already had, but the dominant cost when scanning a whole gallery
// of mostly-non-slip photos through this engine.
export interface OcrTextRecognizer {
  recognize(bytes: Uint8Array): Promise<string>;
}

export const tesseractOcrRecognizer: OcrTextRecognizer = {
  recognize(bytes: Uint8Array): Promise<string> {
    return getOcrWorkerPool().recognize(bytes);
  },
};
