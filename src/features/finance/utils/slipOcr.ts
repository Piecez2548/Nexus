import type { Worker } from "tesseract.js";

// Imported dynamically (not at module top-level) so the OCR engine — a
// large WASM-adjacent library — isn't pulled into the Transactions page's
// bundle for every user, only for the ones who actually open the scanner.
async function getCreateWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker;
}

// Runs entirely on-device via Tesseract.js/WASM — the slip image is never
// uploaded anywhere. The recognition engine's own static library files may
// be fetched from a CDN on first use (like any npm dependency), but no
// user data is transmitted.
export async function recognizeSlipText(image: File | Blob): Promise<string> {
  const createWorker = await getCreateWorker();
  const worker = await createWorker("tha+eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Reuses a single worker across every image instead of spinning one up per
// image (each init reloads the language model) — the only way batch
// scanning several slips is fast enough to be usable.
export async function recognizeSlipTextBatch(
  images: (File | Blob)[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  if (images.length === 0) return [];

  const createWorker = await getCreateWorker();
  const worker: Worker = await createWorker("tha+eng");
  const results: string[] = [];

  try {
    for (const image of images) {
      const {
        data: { text },
      } = await worker.recognize(image);
      results.push(text);
      onProgress?.(results.length, images.length);
    }
  } finally {
    await worker.terminate();
  }

  return results;
}
