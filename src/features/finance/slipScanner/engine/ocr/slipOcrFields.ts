import { parseSlipText } from "@/features/finance/utils/slipParser";

// The fields OCR recovers from a slip when the QR is unusable. Amount, date and
// merchant reuse the app's existing `parseSlipText` extraction verbatim (no
// duplicated business logic); this module only adds the two fields that parser
// doesn't surface — transaction time and reference number.
export interface OcrSlipFields {
  amount?: number;
  date?: string;
  time?: string;
  reference?: string;
  merchant?: string;
}

// Match HH:MM or HH:MM:SS (Thai slips often suffix time with "น."). Amounts and
// numeric dates carry no colon, so a colon-anchored match is a safe
// discriminator; ranges are validated to reject false positives.
function extractTime(text: string): string | undefined {
  const match = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (!match) return undefined;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] !== undefined ? Number(match[3]) : undefined;
  if (hours > 23 || minutes > 59 || (seconds !== undefined && seconds > 59)) return undefined;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return seconds !== undefined ? `${hh}:${mm}:${String(seconds).padStart(2, "0")}` : `${hh}:${mm}`;
}

// Capture the reference/transaction number that follows a known label (Thai or
// English). References are long alphanumeric tokens, so a 6+ char floor rejects
// stray fragments.
function extractReference(text: string): string | undefined {
  const match =
    /(?:เลขที่รายการ|รหัสอ้างอิง|หมายเลขอ้างอิง|เลขที่อ้างอิง|อ้างอิง|Ref(?:erence)?(?:\s*(?:No\.?|Number|ID))?|Transaction\s*(?:No\.?|ID))\s*[:#.]?\s*([A-Za-z0-9]{6,})/i.exec(
      text,
    );
  return match?.[1]?.trim() || undefined;
}

export function extractOcrSlipFields(text: string): OcrSlipFields {
  const base = parseSlipText(text);
  return {
    amount: base.amount,
    date: base.date,
    time: extractTime(text),
    reference: extractReference(text),
    merchant: base.recipient,
  };
}
