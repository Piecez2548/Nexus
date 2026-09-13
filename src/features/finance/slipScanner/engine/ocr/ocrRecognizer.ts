import { getOcrWorkerPool } from "@/features/finance/slipScanner/engine/ocr/ocrWorkerPool";

// Byte-oriented OCR seam for the scanner engine. Detection/parsing logic
// depends on this interface, not on Tesseract, so the fallback is
// unit-testable with a fake recognizer and the heavy WASM engine stays out of
// the code path (and the bundle) until a slip actually needs OCR. The default
// routes through a small reused Tesseract worker pool (ocrWorkerPool.ts)
// rather than spawning and tearing down a fresh worker for every call, which
// is especially expensive when scanning a whole gallery of mostly-non-slip
// photos through this engine.
export interface OcrTextRecognizer {
  recognize(bytes: Uint8Array): Promise<string>;
}

export const tesseractOcrRecognizer: OcrTextRecognizer = {
  recognize(bytes: Uint8Array): Promise<string> {
    return getOcrWorkerPool().recognize(bytes);
  },
};
