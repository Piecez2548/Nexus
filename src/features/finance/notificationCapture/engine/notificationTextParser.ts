// Lightweight parser for a bank app's own push-notification text (title +
// text + bigText, concatenated) -- deliberately NOT a reuse of
// slipParser.ts/extractOcrSlipFields.ts, both tuned for noisy multi-line OCR
// text with positional heuristics (payer block -> payee name, multi-line
// account scanning) that don't apply to a 1-2 line push body.
//
// Real bank notification text formats are UNVERIFIED as of this writing --
// see this feature's task-registry entry for the on-device capture
// procedure (`adb shell dumpsys notification --noredact`) that should
// confirm/refine these patterns against real notifications before Phase 1
// ships. The regexes below are a reasonable starting guess, not a solved
// problem.
export interface ParsedNotification {
  amount?: number;
  counterparty?: string;
}

const DECIMAL = "\\d{1,3}(?:,\\d{3})*\\.\\d{2}";

function toAmount(raw: string): number | undefined {
  const amount = Number(raw.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

// Mirrors slipParser.ts's currency-anchored priority (the "20 -> 520" bug
// class this project already hit once for full slip OCR text) -- but MORE
// conservative than slipParser.ts: no bare-2-decimal-number fallback. A
// terse notification has much less context than a full slip, so an
// unanchored number is more likely to be something else entirely (a phone
// number fragment, a promo code, an account balance) than the actual
// transaction amount. Returning undefined here means the candidate simply
// won't reach the confirm sheet (runSmartImport already hard-rejects a
// missing/non-positive amount regardless), which is the safer failure mode
// for a one-tap-confirm flow than risking a wrong amount a distracted user
// taps through.
function extractAmount(text: string): number | undefined {
  const beforeCurrency = new RegExp(`(${DECIMAL})\\s*(?:บาท|฿|THB|บ\\.)`, "i").exec(text);
  if (beforeCurrency?.[1]) return toAmount(beforeCurrency[1]);

  const afterSymbol = new RegExp(`฿\\s*(${DECIMAL})`, "i").exec(text);
  if (afterSymbol?.[1]) return toAmount(afterSymbol[1]);

  return undefined;
}

// Best-effort: text following a "to"/"ไปยัง"/"ให้(กับ)" marker, stopping at a
// double-space or run's end (bank apps often pad/right-align trailing detail
// with multiple spaces). Absence is common and fine -- amount alone is
// enough for a candidate to reach the confirm sheet.
const COUNTERPARTY_MARKER = /(?:ไปยัง|ให้กับ|ให้|to)\s*[:-]?\s*([^\n\r0-9][^\n\r]*?)(?:\s{2,}|$)/iu;

function extractCounterparty(text: string): string | undefined {
  const match = COUNTERPARTY_MARKER.exec(text);
  const name = match?.[1]?.trim();
  return name && name.length >= 2 ? name : undefined;
}

export function parseNotificationText(text: string): ParsedNotification {
  return {
    amount: extractAmount(text),
    counterparty: extractCounterparty(text),
  };
}
