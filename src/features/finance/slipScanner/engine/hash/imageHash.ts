import { sha256Hex } from "@/features/finance/slipScanner/engine/hash/contentHash";
import { computePHash } from "@/features/finance/slipScanner/engine/hash/perceptualHash";
import { luma } from "@/features/finance/slipScanner/engine/image/canvas";

export interface ImageHashes {
  sha256: string; // exact content hash (GS-006) — same bytes → same hash
  pHash: string | null; // perceptual hash — near-identical images → near-identical hash; null off-browser
}

// Reduce an image's bytes to a 32×32 grayscale array via the browser image
// pipeline. Returns null outside a browser/WebView (jsdom tests), so pHash
// degrades gracefully to null while SHA-256 always works.
async function toGrayscale32(bytes: Uint8Array): Promise<number[] | null> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 32, 32);
    const { data } = ctx.getImageData(0, 0, 32, 32);
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(luma(data[i]!, data[i + 1]!, data[i + 2]!));
    }
    return gray;
  } catch {
    return null;
  }
}

// Compute both hashes for an image. SHA-256 for exact-duplicate detection;
// pHash for modified/near-duplicate detection (GS-024, consumed by the Smart
// Duplicate Engine GS-031).
export async function hashImage(bytes: Uint8Array): Promise<ImageHashes> {
  const sha256 = await sha256Hex(bytes);
  const gray = await toGrayscale32(bytes);
  return { sha256, pHash: gray ? computePHash(gray) : null };
}
