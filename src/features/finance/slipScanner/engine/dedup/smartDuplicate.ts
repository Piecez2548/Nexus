import { arePerceptuallySimilar } from "@/features/finance/slipScanner/engine/hash/perceptualHash";

// Smart Duplicate Engine (GS-031): a graded duplicate *probability* between two
// slips, refining GS-013's binary key. Compares QR payload, reference, amount,
// merchant, timestamp and image perceptual hash (GS-024). Independent matching
// signals combine via noisy-OR, so any one strong signal (identical payload,
// same reference, near-identical image) already implies a high probability, and
// weak signals reinforce each other.

export interface DuplicateSignals {
  payload?: string | null;
  reference?: string;
  amount?: number;
  merchant?: string;
  timestamp?: string;
  pHash?: string | null;
}

export interface DuplicateScore {
  probability: number; // 0–1
  matched: string[]; // which signals agreed
}

const WEIGHTS = { payload: 0.85, reference: 0.8, pHash: 0.7, timestamp: 0.4, amount: 0.3, merchant: 0.3 } as const;

// A transaction confirmed via Payment Notification Capture never has a time
// (the bank notification carries no reliably-parseable one, so
// buildNotificationCandidate.ts leaves it unset) while a later gallery/OCR
// scan of the same physical slip does (read straight off the printed
// receipt). A pure string-equality timestamp check — "2026-08-17" vs
// "2026-08-17 14:35" — never matches for that pair even though they're the
// same real-world payment, which is exactly why that duplicate previously
// slipped through undetected (see the Payment Notification Capture task
// registry entry). Five minutes covers realistic timestamp jitter (OCR
// misreads a digit, or the two sources round seconds differently) when both
// sides do have a time, without being wide enough to treat two genuinely
// different same-day purchases minutes apart as the same one.
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

function norm(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function normRef(value: string | undefined): string {
  return value ? value.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

interface ParsedTimestamp {
  dateOnly: string;
  epochMs: number | undefined; // set only when a time component was present
}

// Accepts "YYYY-MM-DD" or "YYYY-MM-DD HH:MM[:SS]" (the exact shape
// smartImport.ts's candidateSignals/transactionSignals produce by joining
// date+time with a space). Anything else (a malformed or unexpected format)
// is left unparsed — the caller's exact-string fallback still catches a
// literal match either way, and timestampsMatch simply won't award a
// tolerance-based match for a string it can't make sense of.
function parseTimestamp(value: string): ParsedTimestamp | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?$/.exec(value.trim());
  if (!match) return undefined;
  const [, dateOnly, hhmm] = match as unknown as [string, string, string | undefined];
  if (!hhmm) return { dateOnly, epochMs: undefined };
  const epochMs = new Date(`${dateOnly}T${hhmm}:00`).getTime();
  return { dateOnly, epochMs: Number.isNaN(epochMs) ? undefined : epochMs };
}

// Exact (normalized) string equality is still the fast, unambiguous path.
// Beyond that: if both sides carry a time, they're treated as the same
// moment within TIMESTAMP_TOLERANCE_MS; if either side is date-only (the
// notification-capture gap above), falls back to same-calendar-day. That
// date-only fallback is deliberately coarser and carries a real, accepted
// tradeoff: two genuinely different purchases on the same day, for the same
// amount, at the same merchant, with no time recorded on one of them, will
// also be treated as a likely duplicate. That's judged the better failure
// mode for a personal finance app than the alternative this fix closes —
// notification-confirmed transactions silently duplicating every time the
// same slip is later reached by a gallery scan.
function timestampsMatch(a: string, b: string): boolean {
  const normA = norm(a);
  const normB = norm(b);
  if (normA === normB) return true;

  const parsedA = parseTimestamp(normA);
  const parsedB = parseTimestamp(normB);
  if (!parsedA || !parsedB) return false;

  if (parsedA.epochMs !== undefined && parsedB.epochMs !== undefined) {
    return Math.abs(parsedA.epochMs - parsedB.epochMs) <= TIMESTAMP_TOLERANCE_MS;
  }
  return parsedA.dateOnly === parsedB.dateOnly;
}

export function duplicateProbability(a: DuplicateSignals, b: DuplicateSignals): DuplicateScore {
  const matched: Array<keyof typeof WEIGHTS> = [];

  if (a.payload && b.payload && a.payload === b.payload) matched.push("payload");

  const refA = normRef(a.reference);
  const refB = normRef(b.reference);
  if (refA && refB && refA === refB) matched.push("reference");

  if (a.pHash && b.pHash && arePerceptuallySimilar(a.pHash, b.pHash)) matched.push("pHash");

  if (a.timestamp && b.timestamp && timestampsMatch(a.timestamp, b.timestamp)) matched.push("timestamp");

  if (a.amount !== undefined && b.amount !== undefined && a.amount === b.amount) matched.push("amount");

  const merchA = norm(a.merchant);
  const merchB = norm(b.merchant);
  if (merchA && merchB && merchA === merchB) matched.push("merchant");

  let inverse = 1;
  for (const signal of matched) inverse *= 1 - WEIGHTS[signal];
  const probability = matched.length > 0 ? 1 - inverse : 0;

  return { probability, matched };
}

export function isLikelyDuplicate(score: DuplicateScore, threshold = 0.7): boolean {
  return score.probability >= threshold;
}

// Best (highest-probability) match of `target` against a list, or null when the
// list is empty. Callers apply their own threshold to the returned score.
export function findBestDuplicate(
  target: DuplicateSignals,
  candidates: DuplicateSignals[],
): { index: number; score: DuplicateScore } | null {
  let best: { index: number; score: DuplicateScore } | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const score = duplicateProbability(target, candidates[i]!);
    if (!best || score.probability > best.score.probability) best = { index: i, score };
  }
  return best;
}
