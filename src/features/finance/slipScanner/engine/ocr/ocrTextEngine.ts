import { extractOcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

// OCR Text Engine (GS-028): a richer, per-field extraction over raw OCR text
// with a confidence for every field. Reuses GS-012's field extraction for
// amount/date/time/merchant/reference (no duplicated regex logic) and adds
// sender/receiver. Confidence is a deterministic heuristic — label-anchored
// captures score higher than pattern-only ones; absent fields score 0.

export interface OcrField<T> {
  value: T | undefined;
  confidence: number; // 0–1
}

export interface OcrSlipExtraction {
  amount: OcrField<number>;
  date: OcrField<string>;
  time: OcrField<string>;
  merchant: OcrField<string>;
  sender: OcrField<string>;
  receiver: OcrField<string>;
  reference: OcrField<string>;
}

function field<T>(value: T | undefined, confidence: number): OcrField<T> {
  return { value, confidence: value === undefined ? 0 : confidence };
}

function extractLabeled(text: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(text);
  return match?.[1]?.trim() || undefined;
}

export function extractOcrText(text: string): OcrSlipExtraction {
  const base = extractOcrSlipFields(text);

  const sender = extractLabeled(text, /(?:จาก|ผู้โอน|ผู้ส่ง|From|Sender)\s*[:-]?\s*([^\n\r]+)/i);
  const receiver =
    base.merchant ??
    extractLabeled(text, /(?:ไปยัง|ถึง|ผู้รับ(?:เงิน)?|โอนไปยัง|To|Receiver|Name)\s*[:-]?\s*([^\n\r]+)/i);

  return {
    // Pattern-only fields (no explicit label needed) score a bit lower.
    amount: field(base.amount, 0.7),
    date: field(base.date, 0.8),
    time: field(base.time, 0.8),
    merchant: field(base.merchant, 0.7),
    // Label-anchored fields score higher.
    sender: field(sender, 0.85),
    receiver: field(receiver, 0.85),
    reference: field(base.reference, 0.85),
  };
}
