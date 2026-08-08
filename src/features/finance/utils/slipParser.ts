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

function toAmount(raw: string): number | undefined {
  const amount = Number(raw.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function extractAmount(text: string): number | undefined {
  // Thai slip amounts are almost always shown with exactly 2 decimal places,
  // unlike account/reference numbers. But simply taking the first 2-decimal
  // number is wrong — a balance, fee or misread digit elsewhere can be picked
  // (the "20 → 520" bug). Prefer the number anchored to a currency marker
  // (X.XX บาท / ฿X.XX / THB) or an amount label, and only then fall back to the
  // first 2-decimal number.
  const DECIMAL = "\\d{1,3}(?:,\\d{3})*\\.\\d{2}";

  // Most specific: the amount label "จำนวน/จำนวนเงิน" (never "ค่าธรรมเนียม"/fee).
  const amountLabel = new RegExp(`(?:จำนวนเงิน|จำนวน)\\s*[:\\-]?\\s*(${DECIMAL})`, "i").exec(text);
  if (amountLabel?.[1]) return toAmount(amountLabel[1]);

  const beforeCurrency = new RegExp(`(${DECIMAL})\\s*(?:บาท|฿|THB|บ\\.)`, "i").exec(text);
  if (beforeCurrency?.[1]) return toAmount(beforeCurrency[1]);

  const afterSymbol = new RegExp(`฿\\s*(${DECIMAL})`, "i").exec(text);
  if (afterSymbol?.[1]) return toAmount(afterSymbol[1]);

  const afterLabel = new RegExp(
    `(?:จำนวนเงิน|จำนวน|ยอดเงิน|ยอดชำระ|ยอด|Amount|รวมทั้งสิ้น|รวม)\\s*[:\\-]?\\s*(${DECIMAL})`,
    "i",
  ).exec(text);
  if (afterLabel?.[1]) return toAmount(afterLabel[1]);

  const matches = text.match(new RegExp(DECIMAL, "g"));
  if (!matches || matches.length === 0) return undefined;
  return toAmount(matches[0]);
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

// Lines that look like a merchant/shop name (used when a slip has no explicit
// recipient label — e.g. a KBank bill slip where the payee "SCB มณี SHOP
// (ร้านริญญ์น้ำ)" is only positional).
const MERCHANT_MARKERS = /(ร้าน|ห้าง|บริษัท|บจก|หจก|shop|store|company|co\.|ltd|โรงพยาบาล|คลินิก|clinic|hospital)/i;

// A masked/plain account or wallet number line (e.g. "xxx-x-x5327-x",
// "006-xxxxxxxx-6996", "014000008031056") — digits/x/dashes/spaces only.
const ACCOUNT_LINE = /^[0-9xX][0-9xX\s-]{7,}$/;
// Amount/reference/meta labels that are never the payee name.
const META_LINE = /เลขที่รายการ|จำนวน|ค่าธรรมเนียม|รายละเอียด|วันที่|เวลา|amount|date|ref/i;

function extractRecipient(text: string): string | undefined {
  // 1) Explicit recipient label (longest alternatives first so the label isn't
  //    partially consumed).
  const labeled = /(?:โอนไปยัง|ไปยัง|ถึง|ผู้รับเงิน|ผู้รับ|Name)\s*[:-]?\s*([^\n\r]+)/.exec(text);
  const labeledName = labeled?.[1]?.trim();
  if (labeledName) return labeledName;

  const lines = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 2) Positional: on Thai transfer/top-up slips the payer block is
  //    name → bank → account, then the payee's name. So the payee is the first
  //    "name-like" line after the payer's account number (skipping the payee's
  //    own account, amount/meta lines, and arrow/punctuation-only lines).
  const isNameLike = (line: string): boolean => line.replace(/[^\p{L}\p{N}]/gu, "").length >= 3;
  const firstAccount = lines.findIndex((line) => ACCOUNT_LINE.test(line));
  if (firstAccount >= 0) {
    for (let j = firstAccount + 1; j < lines.length; j++) {
      const candidate = lines[j]!;
      if (ACCOUNT_LINE.test(candidate) || META_LINE.test(candidate) || !isNameLike(candidate)) continue;
      return candidate;
    }
  }

  // 3) Fallback: the first line that reads like a shop/merchant name.
  return lines.find((line) => MERCHANT_MARKERS.test(line)) || undefined;
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
