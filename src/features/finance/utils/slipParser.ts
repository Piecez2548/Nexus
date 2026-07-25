const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 1, "มกราคม": 1,
  "ก.พ.": 2, "กุมภาพันธ์": 2,
  "มี.ค.": 3, "มีนาคม": 3,
  "เม.ย.": 4, "เมษายน": 4,
  "พ.ค.": 5, "พฤษภาคม": 5,
  "มิ.ย.": 6, "มิถุนายน": 6,
  "ก.ค.": 7, "กรกฎาคม": 7,
  "ส.ค.": 8, "สิงหาคม": 8,
  "ก.ย.": 9, "กันยายน": 9,
  "ต.ค.": 10, "ตุลาคม": 10,
  "พ.ย.": 11, "พฤศจิกายน": 11,
  "ธ.ค.": 12, "ธันวาคม": 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Buddhist-era years (used throughout Thai slips) run ~543 ahead of Gregorian.
function toGregorianYear(year: number): number {
  if (year < 100) return year + 2500 - 543;
  if (year > 2400) return year - 543;
  return year;
}

function extractAmount(text: string): number | undefined {
  // Thai slip amounts are almost always shown with exactly 2 decimal
  // places, unlike account/reference numbers — a decent discriminator.
  const matches = text.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
  if (!matches || matches.length === 0) return undefined;

  const amount = Number(matches[0].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function extractDate(text: string): string | undefined {
  const numeric = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(text);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = toGregorianYear(Number(numeric[3]));

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const thaiMonthPattern = Object.keys(THAI_MONTHS)
    .sort((a, b) => b.length - a.length)
    .map((m) => m.replace(/\./g, "\\."))
    .join("|");
  const thaiMatch = new RegExp(`(\\d{1,2})\\s*(${thaiMonthPattern})\\s*(\\d{2,4})`).exec(text);

  if (thaiMatch) {
    const day = Number(thaiMatch[1]);
    const month = THAI_MONTHS[thaiMatch[2]];
    const year = toGregorianYear(Number(thaiMatch[3]));
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return undefined;
}

function extractRecipient(text: string): string | undefined {
  const match = /(?:ไปยัง|ถึง|ผู้รับเงิน|โอนไปยัง|Name)\s*[:-]?\s*([^\n\r]+)/.exec(text);
  return match?.[1]?.trim() || undefined;
}

export interface ParsedSlip {
  amount?: number;
  date?: string;
  recipient?: string;
  title?: string;
}

// Best-effort extraction from raw OCR text — always meant to pre-fill an
// editable form for user review, never to save a transaction unattended.
export function parseSlipText(text: string): ParsedSlip {
  const amount = extractAmount(text);
  const date = extractDate(text);
  const recipient = extractRecipient(text);

  return {
    amount,
    date,
    recipient,
    title: recipient ? `โอนเงินให้ ${recipient}` : undefined,
  };
}
