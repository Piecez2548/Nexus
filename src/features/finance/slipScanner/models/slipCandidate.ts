import { combineConfidence } from "@/features/finance/slipScanner/ai/confidenceEngine";
import type { BankIdentification } from "@/features/finance/slipScanner/engine/bank/bankTypes";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import type { OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";
import type { CategoryType } from "@/features/finance/types";

// The unified record the Import Preview lists and Smart Import consumes — one
// per scanned slip, assembled from the extraction stages (QR/EMVCo GS-010, bank
// GS-011, OCR fallback GS-012, dedup GS-013). It is the single shape the UI
// binds to, so the preview never touches the individual engine outputs.
// "notification" (Payment Notification Capture) is built directly by
// buildNotificationCandidate.ts, not buildSlipCandidate below — a bank app's
// own push notification carries no image/QR/OCR to extract.
export type SlipCandidateSource = "qr" | "ocr" | "notification";

export interface SlipCandidate {
  id: string;
  assetId: string;
  // Object URL for the thumbnail — supplied by the scan pipeline (GS-016) from
  // the image bytes; optional so the model stays platform-independent.
  thumbnailUrl?: string;
  bankId?: string;
  bankName?: string;
  amount?: number;
  currency?: string;
  date?: string;
  time?: string;
  merchant?: string;
  reference?: string;
  payload?: string | null;
  source: SlipCandidateSource;
  isDuplicate: boolean;
  // 0–100, from the Confidence Engine (GS-046): a weighted combination of
  // whichever QR/parser/OCR/bank signals this candidate actually has.
  confidence: number;
  // A user correction from the Review Queue, if any — set explicitly by a
  // person, so candidateToTransaction prefers it over the auto-categorize()
  // guess the same way an explicit merchant/amount already wins over a
  // derived one. Absent from the extraction pipeline itself; the AI/parsing
  // stages never set this field.
  category?: string;
  // Set explicitly by Payment Notification Capture's confirm sheet, where a
  // notification can equally be an outgoing payment or incoming money —
  // unlike a scanned slip, which is always an outgoing payment (see
  // candidateToTransaction.ts, which defaults to "expense" when this is
  // absent, matching every other source's existing behavior unchanged).
  type?: CategoryType;
}

export interface SlipCandidateInput {
  assetId: string;
  thumbnailUrl?: string;
  emvco?: EmvcoPayload | null;
  bank?: BankIdentification | null;
  ocr?: OcrSlipFields | null;
  isDuplicate?: boolean;
}

// Fraction of `fields` that are actually present (not undefined/null/empty).
function completeness(fields: ReadonlyArray<string | number | undefined | null>): number {
  if (fields.length === 0) return 0;
  const present = fields.filter((f) => f !== undefined && f !== null && f !== "").length;
  return present / fields.length;
}

interface ConfidenceInput {
  emvco: EmvcoPayload | null;
  qrUsable: boolean;
  ocr: OcrSlipFields | null;
  bank?: BankIdentification | null;
}

// Confidence (GS-046's Confidence Engine, combineConfidence): weights whichever
// of the QR/parser/OCR/bank signals are actually present into one 0–100 score,
// so a QR-only or OCR-only slip is still scored fairly. `qr` reflects whether
// the payload's own checksum passed; `parser` reflects how many fields EMVCo
// itself supplied once trusted; `ocr` reflects OCR field completeness; a
// resolved bank always contributes (0 when the candidate carries QR/OCR data
// but no bank was identified from it, since that's a real, assessable gap).
function slipConfidence(input: ConfidenceInput): number {
  const { emvco, qrUsable, ocr, bank } = input;

  const qr = emvco === null ? undefined : qrUsable ? 1 : 0.4;
  const parser =
    emvco === null
      ? undefined
      : qrUsable
        ? completeness([emvco.amount, emvco.merchantName, emvco.referenceIds[0], emvco.currency])
        : 0.3;
  const ocrScore = ocr === null ? undefined : completeness([ocr.amount, ocr.date, ocr.merchant, ocr.reference, ocr.time]);
  const bankTemplate = bank ? 1 : 0;

  return combineConfidence({ qr, parser, ocr: ocrScore, bankTemplate }).score;
}

// Assemble a candidate from the (already-computed) extraction outputs. Pure and
// image-free: the pipeline that decodes images and runs the engines wires this
// up in GS-016. A CRC-valid EMVCo payload makes the slip QR-sourced; otherwise
// it falls back to the OCR fields.
export function buildSlipCandidate(input: SlipCandidateInput): SlipCandidate {
  const emvco = input.emvco ?? null;
  const ocr = input.ocr ?? null;
  const qrUsable = emvco !== null && emvco.crcValid;
  const source: SlipCandidateSource = qrUsable ? "qr" : "ocr";

  // Trust EMVCo fields only when the QR checksum is valid; a corrupted payload
  // falls back to OCR entirely (its raw string is still kept for reference).
  const amount = (qrUsable ? emvco?.amount : undefined) ?? ocr?.amount;
  const merchant = (qrUsable ? emvco?.merchantName : undefined) ?? ocr?.merchant;
  const reference = (qrUsable ? emvco?.referenceIds[0] : undefined) ?? ocr?.reference;
  const currency = qrUsable ? emvco?.currency : undefined;
  const date = ocr?.date; // EMVCo payment QRs carry no date
  const time = ocr?.time;
  const bankId = input.bank?.bank.id;

  return {
    id: input.assetId,
    assetId: input.assetId,
    thumbnailUrl: input.thumbnailUrl,
    bankId,
    bankName: input.bank?.bank.shortName,
    amount,
    currency,
    date,
    time,
    merchant,
    reference,
    payload: emvco?.raw ?? null,
    source,
    isDuplicate: input.isDuplicate ?? false,
    confidence: slipConfidence({ emvco, qrUsable, ocr, bank: input.bank }),
  };
}
