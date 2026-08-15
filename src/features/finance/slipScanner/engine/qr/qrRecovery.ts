import { imageDataQrDecoder } from "@/features/finance/slipScanner/engine/qr/imageDataDecoder";
import { browserImageVariants, type ImageVariantGenerator } from "@/features/finance/slipScanner/engine/qr/imageVariants";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";

export interface QrRecoveryResult {
  payload: string | null;
  recoveredBy: string | null; // "original" | variant label | null
  attempts: number;
}

export interface QrRecoveryOptions {
  decoder?: QrDecoder;
  variants?: ImageVariantGenerator;
  maxAttempts?: number;
  // Skip re-decoding the original bytes and go straight to transformed
  // variants. Set by callers that have already tried the original with the same
  // decoder (e.g. extractSlipCandidate's QR-detect stage), so the guaranteed-to-
  // fail-again first decode isn't repeated.
  skipOriginal?: boolean;
  // Checked before each variant attempt so a scan cancelled mid-recovery
  // doesn't burn through the remaining rotate/brighten/contrast/upscale
  // attempts (each a real canvas transform + re-decode) for nothing.
  isCancelled?: () => boolean;
}

// QR Recovery Engine (GS-026): decode the original image, and if that fails,
// automatically retry over transformed variants (rotate/brighten/contrast/
// upscale) until one yields a QR. Orchestration is pure and testable with a
// fake decoder + variant generator; the real transforms live in imageVariants.
export async function recoverQr(bytes: Uint8Array, options: QrRecoveryOptions = {}): Promise<QrRecoveryResult> {
  const decoder = options.decoder ?? imageDataQrDecoder;
  const variants = options.variants ?? browserImageVariants;
  const maxAttempts = options.maxAttempts ?? Number.POSITIVE_INFINITY;

  let attempts = 0;
  if (!options.skipOriginal) {
    attempts = 1;
    const original = await decoder.decode(bytes);
    if (original !== null) return { payload: original, recoveredBy: "original", attempts };
  }

  for await (const variant of variants(bytes)) {
    if (attempts >= maxAttempts) break;
    if (options.isCancelled?.()) break;
    attempts += 1;
    const payload = await decoder.decode(variant.bytes);
    if (payload !== null) return { payload, recoveredBy: variant.label, attempts };
  }

  return { payload: null, recoveredBy: null, attempts };
}
