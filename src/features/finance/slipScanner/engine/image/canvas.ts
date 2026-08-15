// Shared canvas helpers for the image pipeline (QR decode, OCR preprocess,
// recovery variants): the OffscreenCanvas/DOM-<canvas> fallback and the luma
// (grayscale) formula were each independently re-implemented in three+ places
// and had started to drift. Centralised here so a device-compat or formula fix
// only needs to happen once.

export interface Canvas2D {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

// Prefers OffscreenCanvas but falls back to a DOM <canvas> — some Android
// WebViews don't expose OffscreenCanvas, which silently broke on-device QR
// decoding (everything fell through to OCR) before this fallback existed.
// Returns null when neither is available (fully off-browser, e.g. tests).
export function makeCanvas(width: number, height: number): Canvas2D | null {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  return null;
}

// Encode a canvas (either kind) to image bytes. Defaults to lossless PNG
// (existing callers — OCR preprocessing, image enhancement — need every pixel
// exact); QR recovery passes "image/jpeg" instead (see imageVariants.ts) since
// real-device measurement showed PNG encoding, run 6x per non-slip photo, was
// the single largest cost in the whole scan pipeline (30-60s/image) — a QR
// code's high-contrast two-tone pattern tolerates JPEG compression fine, and
// JPEG encoding is markedly cheaper than PNG on-device.
export async function canvasToBytes(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mimeType = "image/png",
  quality?: number,
): Promise<Uint8Array> {
  if ("convertToBlob" in canvas) {
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    return new Uint8Array(await blob.arrayBuffer());
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error("toBlob failed");
  return new Uint8Array(await blob.arrayBuffer());
}

// Rec. 601 luma (perceived brightness) from an RGB triplet — the grayscale
// weighting used throughout the scanner's binarise/contrast/hash pipelines.
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
