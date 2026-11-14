import { DEFAULT_OCR_LABELS } from "@/features/finance/slipScanner/engine/bank/bankTemplateRegistry";

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
  // Not followed by a further digit, so a slice of a long number ("0.01" out of
  // a reference misread as "0.0163171133100") is not taken for an amount.
  const DECIMAL = "\\d{1,3}(?:,\\d{3})*\\.\\d{2}(?!\\d)";

  // Each anchored rule takes its first *positive* match. A zero is never a
  // slip amount but is common on the fee line ("ค่าธรรมเนียม 0.00 บาท"), so
  // when OCR garbles the real amount's currency marker (K PLUS "1,300.00
  // นบาท") the fee must not end the search with no amount.
  const firstPositive = (pattern: RegExp): number | undefined => {
    for (const match of text.matchAll(pattern)) {
      const amount = match[1] ? toAmount(match[1]) : undefined;
      if (amount !== undefined) return amount;
    }
    return undefined;
  };

  const currency = new RegExp(`(${DECIMAL})\\s*(?:บาท|฿|THB|บ\\.)`, "gi");
  const anchored =
    // Most specific: the amount label "จำนวน/จำนวนเงิน" (never "ค่าธรรมเนียม"/fee).
    firstPositive(new RegExp(`(?:จำนวนเงิน|จำนวน)\\s*[:\\-]?\\s*(${DECIMAL})`, "gi")) ??
    firstPositive(currency) ??
    firstPositive(new RegExp(`฿\\s*(${DECIMAL})`, "gi")) ??
    firstPositive(new RegExp(`(?:${DEFAULT_OCR_LABELS.amount.join("|")})\\s*[:\\-]?\\s*(${DECIMAL})`, "gi"));
  if (anchored !== undefined) return anchored;

  // Guess from an unanchored number only when the text has no currency-marked
  // number at all. A slip whose only marked amount is the zero fee means the
  // real amount was misread; guessing would pick OCR noise (e.g. "1.05").
  currency.lastIndex = 0;
  if (currency.test(text)) return undefined;
  return firstPositive(new RegExp(`(${DECIMAL})`, "g"));
}

// Plausible Gregorian year bounds for a slip date — rejects a fabricated year
// (e.g. from toGregorianYear misreading a matched account/reference fragment).
const MIN_PLAUSIBLE_YEAR = 2000;
const MAX_PLAUSIBLE_YEAR = 2100;

// Dots, commas, spaces and a stray SARA U that OCR puts inside an abbreviated
// Thai month name; stripped when mapping a match back to its month.
const MONTH_PUNCTUATION = /[.,\s\u0E38]/g;

function extractDate(text: string): string | undefined {
  // Not anchored to digit/dash/x on either side, so the match can't be a
  // fragment inside a longer masked-account or reference-number run (e.g.
  // "xxx-x-x5327-x 006-2-34567-6996" misread as a date).
  const numeric = /(?<![\d\-xX])(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?![\d\-xX])/.exec(text);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = toGregorianYear(Number(numeric[3]));

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= MIN_PLAUSIBLE_YEAR && year <= MAX_PLAUSIBLE_YEAR) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  // OCR often drops or misreads the dots and spacing of an abbreviated month
  // ("11พ.ย.69", "12 พ.ย 69", "12พุย.69" with SARA U for the first dot), so
  // each abbreviation matches with every dot optional (or read as "," / "ุ")
  // and is mapped back by its letters alone.
  const monthByLetters = new Map<string, number>();
  const monthPatterns = Object.keys(THAI_MONTHS)
    .sort((a, b) => b.length - a.length)
    .map((name) => {
      monthByLetters.set(name.replace(MONTH_PUNCTUATION, ""), THAI_MONTHS[name]!);
      if (!name.includes(".")) return name;
      return name
        .split(".")
        .filter(Boolean)
        .join("[.,\\u0E38]?\\s*") + "[.,]?";
    });
  const thaiMatch = new RegExp(`(?<!\\d)(\\d{1,2})\\s*(${monthPatterns.join("|")})\\s*(\\d{2,4})(?!\\d)`).exec(text);

  if (thaiMatch) {
    const day = Number(thaiMatch[1]);
    const month = monthByLetters.get(thaiMatch[2]!.replace(MONTH_PUNCTUATION, ""));
    const year = toGregorianYear(Number(thaiMatch[3]));
    if (month !== undefined && day >= 1 && day <= 31 && year >= MIN_PLAUSIBLE_YEAR && year <= MAX_PLAUSIBLE_YEAR) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return undefined;
}

// Lines that look like a merchant/shop name (used when a slip has no explicit
// recipient label — e.g. a KBank bill slip where the payee "SCB มณี SHOP
// (ร้านริญญ์น้ำ)" is only positional).
const MERCHANT_MARKERS = /(ร้าน|ห้าง|บริษัท|บจก|หจก|shop|store|company|co\.|ltd|โรงพยาบาล|คลินิก|clinic|hospital)/i;

// A masked/plain account or wallet number line (e.g. "xxx-x-x5327-x",
// "006-xxxxxxxx-6996", "014000008031056", or one with an account label glued on
// the same OCR line like "A/C: 006-xxxxxxxx-6996"). The optional prefix is an
// account-specific label only (not any word) so an unrelated labelled digit run
// — e.g. "โทร: 0812345678" — isn't mistaken for the account anchor.
// OCR also reads the slip's icons as a short token in front ("J   XXX-X-X5327-x")
// and the masking x as "%" ("%%%-%-%4983-%"); a digit is still required.
const ACCOUNT_LINE =
  /^(?:\S{1,2}\s+)?(?:(?:เลขที่บัญชี|เลขบัญชี|บัญชี|A\/?C|ACCT|Account)\s*[:-]?\s*)?(?=[^\n]*\d)[0-9xX%][0-9xX%\s-]{7,}$/i;
// Recipient label words. Derived from the shared registry (Thai entries only —
// its generic English hints "to"/"name" are too short to use as a bare
// substring match without risking a false capture) so this list can't drift
// from DEFAULT_OCR_LABELS. Reused for tier 1 below AND folded into META_LINE,
// so a bare label line on its own (name on the next line) isn't later mistaken
// for the recipient itself by the tier-2 positional scan.
const RECIPIENT_LABEL_WORDS = DEFAULT_OCR_LABELS.recipient.filter((w) => /[฀-๿]/.test(w));
// A line that is just the payee's bank label (e.g. "ธ.กสิกรไทย",
// "ธนาคารกสิกรไทย") rather than their actual name — seen on transfer slips
// where the payee's bank is printed the same way the payer's bank is.
const BANK_LABEL_LINE = /^(?:ธนาคาร|ธ\.)\s*\S/i;
// Lines that are never the payee name. Amount labels must be followed by a
// number (so a generic word like "ยอด" in a real name — "ยอดรัก", "ร้านยอดเยี่ยม"
// — isn't skipped), or stand alone on the line (K PLUS prints "จำนวน:" above
// the amount; OCR may read it "จ้านวน:"), while date/reference/recipient/fee
// labels are distinctive enough to match as plain substrings.
const AMOUNT_LABELS = [...DEFAULT_OCR_LABELS.amount, "จ้านวน"].join("|");
const META_LINE = new RegExp(
  `(?:${AMOUNT_LABELS})\\s*[:\\-]?\\s*\\d` +
    `|^(?:${AMOUNT_LABELS})\\s*[:\\-]?$` +
    `|${[...DEFAULT_OCR_LABELS.date, ...DEFAULT_OCR_LABELS.reference, ...RECIPIENT_LABEL_WORDS].join("|")}|ค่าธรรมเนียม|รายละเอียด|เวลา`,
  "i",
);

// At least 3 letters: digits and symbols alone (OCR noise such as "Qs  [3")
// are not a name.
function isNameLike(line: string): boolean {
  return line.replace(/[^\p{L}]/gu, "").length >= 3;
}

// OCR reads the slip's avatar/shop icon as a short token in front of the
// name ("ซู อาหารตามสั่ง", "oO  Gaiauan Fried Chicken", "69  นาย ..."). Drop
// symbols and a 1–2 character token there, unless it is a title, and only
// while the rest still reads as a name.
const LEADING_NOISE = /^(?:[^\p{L}\p{M}\p{N}\s]+\s*|(?!(?:mr|ms|dr)\b)[\p{L}\p{M}\p{N}]{1,2}[^\p{L}\p{M}\p{N}\s]*\s+)/iu;

function stripLeadingNoise(line: string): string {
  let name = line;
  for (let i = 0; i < 2; i++) {
    const stripped = name.replace(LEADING_NOISE, "");
    if (stripped === name || !isNameLike(stripped)) break;
    name = stripped;
  }
  return name.trim();
}

function extractRecipient(text: string): string | undefined {
  // 1) Explicit recipient label.
  const labeled = new RegExp(`(?:${RECIPIENT_LABEL_WORDS.join("|")}|Name)\\s*[:-]?\\s*([^\\n\\r]+)`).exec(text);
  const labeledName = labeled?.[1]?.trim();
  if (labeledName) return labeledName;

  const lines = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 2) Positional: on Thai transfer/top-up slips the payer block is
  //    name → bank → account, then the payee's name. So the payee is the first
  //    "name-like" line after the payer's account number (skipping the payee's
  //    own account, amount/meta lines, a bare bank-label line, and
  //    arrow/punctuation-only lines).
  const firstAccount = lines.findIndex((line) => ACCOUNT_LINE.test(line));
  if (firstAccount >= 0) {
    for (let j = firstAccount + 1; j < lines.length; j++) {
      const candidate = lines[j]!;
      if (ACCOUNT_LINE.test(candidate) || META_LINE.test(candidate) || BANK_LABEL_LINE.test(candidate) || !isNameLike(candidate)) continue;
      return stripLeadingNoise(candidate);
    }
  }

  // 3) Fallback: the first line that reads like a shop/merchant name.
  return lines.find((line) => MERCHANT_MARKERS.test(line)) || undefined;
}

// The payer's name: on Thai transfer slips the payer block is name → bank →
// account, so it is the nearest name-like line above the first account line
// (skipping the bank label, the date/time line and the status heading).
const STATUS_OR_TIME_LINE = /\d{1,2}:\d{2}|สำเร็จ|successful/i;

function extractPayer(text: string): string | undefined {
  const lines = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstAccount = lines.findIndex((line) => ACCOUNT_LINE.test(line));
  for (let j = firstAccount - 1; j >= 0; j--) {
    const candidate = lines[j]!;
    if (BANK_LABEL_LINE.test(candidate) || META_LINE.test(candidate) || !isNameLike(candidate)) continue;
    if (STATUS_OR_TIME_LINE.test(candidate)) return undefined;
    return stripLeadingNoise(candidate);
  }
  return undefined;
}

export interface ParsedSlip {
  amount?: number;
  date?: string;
  recipient?: string;
  payer?: string;
  title?: string;
}

// Best-effort extraction from raw OCR text — always meant to pre-fill an
// editable form for user review, never to save a transaction unattended.
export function parseSlipText(rawText: string): ParsedSlip {
  // Tesseract often emits SARA AM as NIKHAHIT + SARA AA ("จํานวน"), which
  // would never match the "จำนวน" label; fold it back to the single code point.
  const text = rawText.replace(/\u0E4D\u0E32/g, "\u0E33");
  const amount = extractAmount(text);
  const date = extractDate(text);
  const recipient = extractRecipient(text);
  const payer = extractPayer(text);

  return {
    amount,
    date,
    recipient,
    payer,
    title: recipient ? `โอนเงินให้ ${recipient}` : undefined,
  };
}
