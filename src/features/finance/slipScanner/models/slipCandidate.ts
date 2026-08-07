import type { BankIdentification } from "@/features/finance/slipScanner/engine/bank/bankTypes";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import type { OcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

// The unified record the Import Preview lists and Smart Import consumes — one
// per scanned slip, assembled from the extraction stages (QR/EMVCo GS-010, bank
// GS-011, OCR fallback GS-012, dedup GS-013). It is the single shape the UI
// binds to, so the preview never touches the individual engine outputs.
export type SlipCandidateSource = "qr" | "ocr";

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
  // 0–100. A deterministic completeness/source heuristic here; the dedicated
  // Confidence Engine (GS-046) refines it later.
  confidence: number;
}

export interface SlipCandidateInput {
  assetId: string;
  thumbnailUrl?: string;
  emvco?: EmvcoPayload | null;
  bank?: BankIdentification | null;
  ocr?: OcrSlipFields | null;
  isDuplicate?: boolean;
}

interface ConfidenceInput {
  source: SlipCandidateSource;
  crcValid: boolean;
  amount?: number;
  date?: string;
  merchant?: string;
  reference?: string;
  bankId?: string;
}

// A transparent completeness score: a CRC-valid QR is the strongest base, then
// points for each resolved field. Superseded by GS-046's Confidence Engine.
export function basicConfidence(input: ConfidenceInput): number {
  let score = input.source === "qr" ? (input.crcValid ? 40 : 20) : 10;
  if (input.amount !== undefined) score += 20;
  if (input.date) score += 10;
  if (input.merchant) score += 10;
  if (input.reference) score += 10;
  if (input.bankId) score += 10;
  return Math.min(100, score);
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
    confidence: basicConfidence({
      source,
      crcValid: emvco?.crcValid ?? false,
      amount,
      date,
      merchant,
      reference,
      bankId,
    }),
  };
}
