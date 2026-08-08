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

function norm(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function normRef(value: string | undefined): string {
  return value ? value.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

export function duplicateProbability(a: DuplicateSignals, b: DuplicateSignals): DuplicateScore {
  const matched: Array<keyof typeof WEIGHTS> = [];

  if (a.payload && b.payload && a.payload === b.payload) matched.push("payload");

  const refA = normRef(a.reference);
  const refB = normRef(b.reference);
  if (refA && refB && refA === refB) matched.push("reference");

  if (a.pHash && b.pHash && arePerceptuallySimilar(a.pHash, b.pHash)) matched.push("pHash");

  const tsA = norm(a.timestamp);
  const tsB = norm(b.timestamp);
  if (tsA && tsB && tsA === tsB) matched.push("timestamp");

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
