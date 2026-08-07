// Slip-level duplicate detection — distinct from the image-byte content-hash
// dedup the scan orchestration already does (GS-006/007). That prevents
// scanning the same *file* twice; this prevents *importing the same
// transaction* twice even when it arrives as two different images (a QR decode
// and an OCR read of the same slip, a screenshot plus a re-saved copy). It
// compares the fields the slip actually carries: payload, references, amount,
// timestamp, merchant and bank.

export interface SlipDedupFields {
  payload?: string | null;
  ref1?: string;
  ref2?: string;
  amount?: number;
  timestamp?: string;
  merchant?: string;
  bank?: string;
}

function normText(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

// References carry cosmetic dashes/spaces across QR vs OCR; strip them so the
// same reference matches regardless of formatting.
function normRef(value: string | undefined): string {
  return value ? value.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

function normAmount(value: number | undefined): string {
  return value !== undefined && Number.isFinite(value) ? value.toFixed(2) : "";
}

// A slip only has enough to judge duplication if it carries a reference, a
// payload, or an amount. Without any of those, never treat it as a duplicate
// (better to allow a possible re-import than to silently drop a distinct one).
function hasSignal(fields: SlipDedupFields): boolean {
  return Boolean(normRef(fields.ref1) || normRef(fields.ref2) || (fields.payload ?? "").trim() || normAmount(fields.amount));
}

// A deterministic fingerprint for a slip. A reference number uniquely
// identifies a bank transaction, so when present it is the authoritative key
// (matching the same transaction seen via QR and via OCR). Otherwise fall back
// to the full field tuple — which correctly keeps distinct payments to the same
// static QR (identical payload, different amount/time) as separate slips.
export function slipDuplicateKey(fields: SlipDedupFields): string {
  const bank = normText(fields.bank);
  const ref = normRef(fields.ref1) || normRef(fields.ref2);
  if (ref) return `ref:${bank}:${ref}`;

  const tuple = [
    bank,
    normAmount(fields.amount),
    normText(fields.timestamp),
    normText(fields.merchant),
    (fields.payload ?? "").trim(),
  ].join("|");
  return `tuple:${tuple}`;
}

export interface DuplicateDetector {
  // Non-mutating: has this slip been seen already?
  isDuplicate(fields: SlipDedupFields): boolean;
  // Mark a slip as seen (no-op when it carries no dedup signal).
  register(fields: SlipDedupFields): void;
  // Atomic check-and-register: returns true if it was ALREADY seen (a
  // duplicate to skip), otherwise records it and returns false. The has()+add()
  // pair has no await between it, so it is race-free under the concurrent scan
  // queue (single-threaded JS), matching the GS-007 within-run dedup pattern.
  markSeen(fields: SlipDedupFields): boolean;
}

export function createDuplicateDetector(seedKeys?: Iterable<string>): DuplicateDetector {
  const seen = new Set<string>(seedKeys);

  return {
    isDuplicate(fields) {
      return hasSignal(fields) && seen.has(slipDuplicateKey(fields));
    },
    register(fields) {
      if (hasSignal(fields)) seen.add(slipDuplicateKey(fields));
    },
    markSeen(fields) {
      if (!hasSignal(fields)) return false;
      const key = slipDuplicateKey(fields);
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    },
  };
}
