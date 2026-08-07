import { recognizeSlipText } from "@/features/finance/utils/slipOcr";

// Byte-oriented OCR seam for the scanner engine. Detection/parsing logic
// depends on this interface, not on Tesseract, so the fallback is
// unit-testable with a fake recognizer and the heavy WASM engine stays out of
// the code path (and the bundle) until a slip actually needs OCR. The default
// reuses the app's existing on-device Tesseract worker (`recognizeSlipText`) —
// no second OCR pipeline is introduced.
export interface OcrTextRecognizer {
  recognize(bytes: Uint8Array): Promise<string>;
}

export const tesseractOcrRecognizer: OcrTextRecognizer = {
  async recognize(bytes: Uint8Array): Promise<string> {
    return recognizeSlipText(new Blob([bytes as unknown as BlobPart]));
  },
};
