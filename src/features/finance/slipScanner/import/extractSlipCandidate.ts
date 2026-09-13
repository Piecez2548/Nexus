import { identifyBank } from "@/features/finance/slipScanner/engine/bank/bankIdentifier";
import { identifyBankFromText } from "@/features/finance/slipScanner/engine/bank/bankTextIdentifier";
import { parseEmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { runOcrFallback, shouldRunOcrFallback } from "@/features/finance/slipScanner/engine/ocr/ocrFallback";
import { tesseractOcrRecognizer, type OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import type { OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";
import { recoverQr, type QrRecoveryResult } from "@/features/finance/slipScanner/engine/qr/qrRecovery";
import { defaultQrDetector, type QrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import { buildSlipCandidate, type SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

export interface ExtractSlipInput {
  assetId: string;
  bytes: Uint8Array;
  thumbnailUrl?: string;
  // Overridable for tests; defaults use the real jsQR decoder + Tesseract OCR.
  detector?: QrDetector;
  recognizer?: OcrTextRecognizer;
  // QR Recovery Engine (GS-026), overridable for tests; defaults to the real
  // rotate/brighten/contrast/upscale retry decoder.
  recover?: (bytes: Uint8Array, isCancelled: () => boolean) => Promise<QrRecoveryResult>;
  // Checked between the slow stages (QR recovery's variant attempts, and
  // before committing to OCR) so a scan cancelled mid-image stops promptly
  // instead of only being interruptible between whole images -- Tesseract's
  // own recognize() call can't be interrupted once started, so this can't
  // make an in-flight OCR call stop, but it skips starting a NEW one.
  isCancelled?: () => boolean;
  // Skip OCR entirely for an image where NEITHER the initial detect NOR QR
  // recovery found any QR at all (detection.hasQr stays false all the way
  // through) -- a deliberate speed/completeness tradeoff for the whole-
  // gallery auto-scan (useFullGalleryScan), where the overwhelming majority
  // of photos aren't slips and OCR (even pooled) is the dominant per-image
  // cost on real devices. Real Thai bank-app completed-transaction slips
  // overwhelmingly carry SOME QR (a slip-verification QR, not always a
  // payment QR -- see the module comment below), so this is a real but
  // deliberately bounded risk, not a blind heuristic: a slip whose QR is
  // fully absent (not just damaged -- recovery already tried 6 variants) is
  // the only case this can miss. Does NOT gate the manual single/multi-photo
  // picker flow (useSlipScan leaves this unset), where every picked photo is
  // a user-confirmed candidate slip and OCR should always be attempted.
  skipOcrWhenNoQr?: boolean;
  // QR-only gallery mode: retain only images where a QR was detected. OCR
  // fallback still runs for a detected QR that is not a usable EMVCo payload,
  // because Thai slip-verification QRs commonly need printed date/time and
  // bank metadata from OCR. The full/manual picker path leaves this unset. A
  // null result is handled by createSlipExtractionProcessor as a deliberate
  // filter, not a failed scan.
  qrOnly?: boolean;
  // Optional strict speed mode for callers that accept losing OCR metadata on
  // non-EMVCo QR slips. Full-gallery scanning keeps this off to preserve the
  // existing fallback behavior; valid EMVCo QRs already skip OCR naturally.
  skipOcrWhenQr?: boolean;
  // Upper bound for transformed QR recovery attempts. This bounds the slow
  // path on large galleries; the initial detector pass is separate. When QR
  // only is enabled the default is two transformed variants, which keeps the
  // common per-image path predictable while still covering the two most common
  // sideways/low-contrast cases.
  maxRecoveryAttempts?: number;
}

export interface QrOnlyExtractSlipInput extends ExtractSlipInput {
  qrOnly: true;
}

// Distinguishes a deliberate mid-extraction stop from a real extraction
// failure -- not that the queue needs to tell them apart today (its own
// retry-loop cancellation check already short-circuits either way after one
// cheap retry-delay wait), but a future caller inspecting a rejection reason
// shouldn't mistake this for a bug.
export class ScanCancelledError extends Error {
  constructor() {
    super("scan cancelled");
    this.name = "ScanCancelledError";
  }
}

const DEFAULT_QR_ONLY_RECOVERY_ATTEMPTS = 2;

// The single "image bytes → SlipCandidate" entry point wiring the extraction
// stages together: QR detect (retrying transformed variants when the original
// yields no QR) → EMVCo parse → bank identify → OCR fallback (when the QR is
// missing/damaged/non-EMVCo, or a usable QR still left the bank unidentified)
// → candidate build. Bank comes from the EMVCo payload when present; otherwise
// it is identified from the OCR text (most real Thai completed slips carry a
// slip-verification QR, not an EMVCo payment QR, so the bank name on the slip
// is the reliable signal — this also covers a clean, CRC-valid EMVCo payload
// from a bank rail the identifier has no GUID/plugin match for).
export function extractSlipCandidate(input: QrOnlyExtractSlipInput): Promise<SlipCandidate | null>;
export function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate>;
export async function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate | null> {
  const detector = input.detector ?? defaultQrDetector;
  const recognizer = input.recognizer ?? tesseractOcrRecognizer;
  const isCancelled = input.isCancelled ?? (() => false);
  // The detect stage already tried the original bytes with the same decoder, so
  // recovery skips straight to transformed variants.
  const recover = input.recover ?? ((bytes: Uint8Array, cancelled: () => boolean) => recoverQr(bytes, {
    skipOriginal: true,
    isCancelled: cancelled,
    maxAttempts: input.maxRecoveryAttempts ?? (input.qrOnly ? DEFAULT_QR_ONLY_RECOVERY_ATTEMPTS : Number.POSITIVE_INFINITY),
  }));

  let detection = await detector.detect(input.bytes);
  if (!detection.hasQr) {
    if (isCancelled()) throw new ScanCancelledError();
    try {
      const recovery = await recover(input.bytes, isCancelled);
      if (recovery.payload !== null) detection = { hasQr: true, payload: recovery.payload };
    } catch (err) {
      if (err instanceof ScanCancelledError) throw err;
      // Recovery is best-effort (canvas transforms can throw under memory
      // pressure); a failure must not abort the batch — fall through to OCR.
    }
  }

  // In QR-only mode a non-QR image is intentionally filtered out before any
  // parser, bank or OCR work. Returning null lets the queue mark the image as
  // scanned without persisting a misleading OCR candidate.
  if (input.qrOnly === true && !detection.hasQr) return null;

  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  let bank = emvco ? identifyBank(emvco) : null;

  let ocr: OcrSlipFields | null = null;
  const needsOcrFallback = shouldRunOcrFallback({ hasQr: detection.hasQr, emvco });
  const skipForNoQr = input.skipOcrWhenNoQr === true && !detection.hasQr;
  if ((needsOcrFallback || !bank) && !skipForNoQr && input.skipOcrWhenQr !== true) {
    // OCR is the one stage that, once started, can't be interrupted (Tesseract
    // exposes no mid-recognize cancellation) -- this is the last checkpoint
    // that can still skip it entirely rather than start a call that will run
    // to completion regardless.
    if (isCancelled()) throw new ScanCancelledError();
    try {
      const result = await runOcrFallback(input.bytes, recognizer);
      // Keep the OCR fields even when OCR ran only to resolve the bank: a
      // CRC-valid EMVCo QR carries no date/time, so these come from OCR
      // regardless (buildSlipCandidate still prefers EMVCo for amount/merchant).
      ocr = result;
      if (!bank) bank = identifyBankFromText(result.text);
    } catch (err) {
      if (err instanceof ScanCancelledError) throw err;
      // Tesseract can genuinely fail to read a specific image (corrupt file,
      // unsupported format/codec) -- confirmed on-device via a real gallery
      // photo throwing "Error attempting to read image" from Tesseract's own
      // Leptonica layer. OCR is best-effort exactly like QR recovery above:
      // one unreadable image must not crash the whole batch, and this asset
      // still gets a candidate (QR-only fields, or none) rather than being
      // lost to an uncaught rejection that could also leave a pooled worker
      // in an inconsistent state for the next image.
    }
  }

  return buildSlipCandidate({
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    emvco,
    bank,
    ocr,
    // A gallery candidate is marked as QR-sourced only when the decoded
    // payload is a CRC-valid EMVCo payment QR. Non-EMVCo or damaged QR images
    // still retain their OCR fields, but must not be auto-imported as verified
    // transactions.
    sourceOverride: input.qrOnly === true && emvco?.crcValid === true ? "qr" : undefined,
  });
}
