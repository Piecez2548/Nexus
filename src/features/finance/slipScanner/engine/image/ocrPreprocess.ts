import { binarize, otsuThreshold } from "@/features/finance/slipScanner/engine/image/otsu";

// OCR preprocessing (OCR tuning): upscale small images and binarise (grayscale
// → Otsu threshold → black/white) so watermarks/coloured backgrounds drop out
// and text is crisp for Tesseract. Browser-only; returns the original bytes
// off-browser or on any failure, so it never blocks OCR.

interface Canvas2D {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

function makeCanvas(width: number, height: number): Canvas2D | null {
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

async function toBytes(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Uint8Array> {
  if ("convertToBlob" in canvas) {
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("toBlob failed");
  return new Uint8Array(await blob.arrayBuffer());
}

export async function preprocessForOcr(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof createImageBitmap !== "function") return bytes;

  try {
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    // Upscale small images toward ~1200px on the short edge (helps Tesseract on
    // small digits); never downscale, cap at 2× to bound memory.
    const scale = Math.min(2, Math.max(1, 1200 / Math.max(1, Math.min(bitmap.width, bitmap.height))));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const target = makeCanvas(width, height);
    if (!target) return bytes;
    target.ctx.drawImage(bitmap, 0, 0, width, height);

    const image = target.ctx.getImageData(0, 0, width, height);
    const gray = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      gray[p] = Math.round(0.299 * image.data[i]! + 0.587 * image.data[i + 1]! + 0.114 * image.data[i + 2]!);
    }

    binarize(gray, otsuThreshold(gray));

    for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
      const v = gray[p]!;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    target.ctx.putImageData(image, 0, 0);

    return await toBytes(target.canvas);
  } catch {
    return bytes;
  }
}
