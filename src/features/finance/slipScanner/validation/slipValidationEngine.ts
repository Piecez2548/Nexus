import { PROMPTPAY_AID_PREFIX } from "@/features/finance/slipScanner/engine/emvco/emvcoTags";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { toLocalDateString } from "@/utils/localDate";

// Slip Validation Engine (GS-025): rigorous, deterministic validation of a
// slip's structure and fields, producing per-field validity plus a confidence
// score. Distinct from GS-019 (candidate-level advisory warnings) — this
// validates the EMVCo/PromptPay payload and field *formats* and feeds the
// Confidence Engine (GS-046). Works for QR slips (payload) and OCR slips
// (fields), so it accepts either source.

export interface FieldValidity {
  valid: boolean;
  issues: string[];
}

export interface SlipValidationReport {
  emvcoValid: boolean; // CRC-valid EMVCo payload present
  isPromptPay: boolean;
  amount: FieldValidity;
  timestamp: FieldValidity;
  merchant: FieldValidity;
  reference: FieldValidity;
  confidence: number; // 0–100
  valid: boolean; // overall: usable EMVCo/amount essentials
}

export interface SlipValidationInput {
  payload: EmvcoPayload | null;
  amount?: number;
  merchant?: string;
  reference?: string;
  date?: string; // YYYY-MM-DD (EMVCo carries none; comes from OCR)
  time?: string; // HH:MM[:SS]
  today?: () => string;
}

const MAX_AMOUNT = 10_000_000; // 10M THB ceiling for a plausible slip
const MERCHANT_MAX = 25; // EMVCo tag 59 max length
const REFERENCE_RE = /^[A-Za-z0-9]{1,32}$/;

const CONFIDENCE_WEIGHTS = { emvco: 25, promptPay: 10, amount: 25, reference: 15, merchant: 15, timestamp: 10 } as const;

function validateAmount(amount: number | undefined): FieldValidity {
  const issues: string[] = [];
  if (amount === undefined) issues.push("missing");
  else if (!Number.isFinite(amount)) issues.push("not-a-number");
  else if (amount <= 0) issues.push("non-positive");
  else if (amount > MAX_AMOUNT) issues.push("implausible");
  return { valid: issues.length === 0, issues };
}

function validateMerchant(merchant: string | undefined): FieldValidity {
  const issues: string[] = [];
  const trimmed = merchant?.trim() ?? "";
  if (trimmed === "") issues.push("missing");
  else if (trimmed.length > MERCHANT_MAX) issues.push("too-long");
  return { valid: issues.length === 0, issues };
}

function validateReference(reference: string | undefined): FieldValidity {
  const issues: string[] = [];
  const trimmed = reference?.trim() ?? "";
  if (trimmed === "") issues.push("missing");
  else if (!REFERENCE_RE.test(trimmed)) issues.push("bad-format");
  return { valid: issues.length === 0, issues };
}

function validateTimestamp(date: string | undefined, time: string | undefined, today: string): FieldValidity {
  const issues: string[] = [];
  if (!date) {
    issues.push("missing");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    issues.push("bad-format");
  } else if (date > today) {
    issues.push("in-future");
  }
  if (time !== undefined && time !== "" && !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) issues.push("bad-time");
  return { valid: issues.length === 0, issues };
}

export function validateSlip(input: SlipValidationInput): SlipValidationReport {
  const today = (input.today ?? (() => toLocalDateString(new Date())))();
  const payload = input.payload;

  const emvcoValid = payload !== null && payload.crcValid;
  const aid = payload?.promptPay?.aid ?? "";
  const isPromptPay = aid.startsWith(PROMPTPAY_AID_PREFIX.slice(0, 10));

  const amount = validateAmount(input.amount ?? payload?.amount);
  const merchant = validateMerchant(input.merchant ?? payload?.merchantName);
  const reference = validateReference(input.reference ?? payload?.referenceIds[0]);
  const timestamp = validateTimestamp(input.date, input.time, today);

  let confidence = 0;
  if (emvcoValid) confidence += CONFIDENCE_WEIGHTS.emvco;
  if (isPromptPay) confidence += CONFIDENCE_WEIGHTS.promptPay;
  if (amount.valid) confidence += CONFIDENCE_WEIGHTS.amount;
  if (reference.valid) confidence += CONFIDENCE_WEIGHTS.reference;
  if (merchant.valid) confidence += CONFIDENCE_WEIGHTS.merchant;
  if (timestamp.valid) confidence += CONFIDENCE_WEIGHTS.timestamp;

  return {
    emvcoValid,
    isPromptPay,
    amount,
    timestamp,
    merchant,
    reference,
    confidence,
    // A slip is "valid" enough to import when it has a usable amount; a
    // CRC-valid EMVCo payload is a strong signal but OCR slips have none.
    valid: amount.valid && (emvcoValid || input.payload === null),
  };
}
