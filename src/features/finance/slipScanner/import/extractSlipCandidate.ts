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

// The single "image bytes → SlipCandidate" entry point wiring the extraction
// stages together: QR detect (retrying transformed variants when the original
// yields no QR) → EMVCo parse → bank identify → OCR fallback (when the QR is
// missing/damaged/non-EMVCo, or a usable QR still left the bank unidentified)
// → candidate build. Bank comes from the EMVCo payload when present; otherwise
// it is identified from the OCR text (most real Thai completed slips carry a
// slip-verification QR, not an EMVCo payment QR, so the bank name on the slip
// is the reliable signal — this also covers a clean, CRC-valid EMVCo payload
// from a bank rail the identifier has no GUID/plugin match for).
function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export async function extractSlipCandidate(input: ExtractSlipInput): Promise<SlipCandidate> {
  const detector = input.detector ?? defaultQrDetector;
  const recognizer = input.recognizer ?? tesseractOcrRecognizer;
  const isCancelled = input.isCancelled ?? (() => false);
  // The detect stage already tried the original bytes with the same decoder, so
  // recovery skips straight to transformed variants.
  const recover = input.recover ?? ((bytes: Uint8Array, cancelled: () => boolean) => recoverQr(bytes, { skipOriginal: true, isCancelled: cancelled }));

  // TEMPORARY perf-investigation instrumentation (gallery-scan speed
  // investigation, PERF task plan) — per-stage timing so a real-device run
  // shows exactly where the ~15-20s/image cost lives (QR detect vs recovery
  // vs OCR) instead of guessing. Remove once the root cause is confirmed and
  // fixed. Search "perf-investigation" to find every temporary probe.
  const totalStart = perfNow();
  let recoveryMs: number | null = null;
  let ocrMs: number | null = null;

  const detectStart = perfNow();
  let detection = await detector.detect(input.bytes);
  const detectMs = perfNow() - detectStart;
  if (!detection.hasQr) {
    if (isCancelled()) throw new ScanCancelledError();
    try {
      const recoveryStart = perfNow();
      const recovery = await recover(input.bytes, isCancelled);
      recoveryMs = perfNow() - recoveryStart;
      if (recovery.payload !== null) detection = { hasQr: true, payload: recovery.payload };
    } catch (err) {
      if (err instanceof ScanCancelledError) throw err;
      // Recovery is best-effort (canvas transforms can throw under memory
      // pressure); a failure must not abort the batch — fall through to OCR.
    }
  }

  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  let bank = emvco ? identifyBank(emvco) : null;

  let ocr: OcrSlipFields | null = null;
  const needsOcrFallback = shouldRunOcrFallback({ hasQr: detection.hasQr, emvco });
  const skipForNoQr = input.skipOcrWhenNoQr === true && !detection.hasQr;
  if ((needsOcrFallback || !bank) && !skipForNoQr) {
    // OCR is the one stage that, once started, can't be interrupted (Tesseract
    // exposes no mid-recognize cancellation) -- this is the last checkpoint
    // that can still skip it entirely rather than start a call that will run
    // to completion regardless.
    if (isCancelled()) throw new ScanCancelledError();
    const ocrStart = perfNow();
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
    ocrMs = perfNow() - ocrStart;
  }

  // NOTE: the WebView console bridge (Capacitor's onConsoleMessage) only
  // relays the first string argument -- an object argument collapses to
  // "[object Object]" in logcat. Everything must be inlined into one string.
  console.debug(
    `[perf-investigation] extractSlipCandidate assetId=${input.assetId} inputBytes=${input.bytes.length} hasQr=${detection.hasQr} detectMs=${Math.round(detectMs)} recoveryMs=${recoveryMs === null ? "null" : Math.round(recoveryMs)} ocrMs=${ocrMs === null ? "null" : Math.round(ocrMs)} totalMs=${Math.round(perfNow() - totalStart)}`,
  );

  return buildSlipCandidate({
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    emvco,
    bank,
    ocr,
  });
}
