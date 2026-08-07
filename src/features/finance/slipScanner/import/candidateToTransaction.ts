import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";
import { toLocalDateString } from "@/utils/localDate";

export interface CandidateImportOptions {
  // Default account for imported slips (slips don't say which account paid).
  defaultAccount?: string;
  // Title used when the slip has no merchant (UI passes a translated string).
  fallbackTitle?: string;
  // Injectable clock so "today" is deterministic in tests.
  today?: () => string;
}

// Pure mapping from a scanned slip candidate to a transaction draft. Slips are
// outgoing payments, so they import as completed expenses. Bank + reference go
// into the note for traceability; the date falls back to today when the slip
// carries none. Callers should only import candidates that have a positive
// amount — the mapper assumes one is present.
export function candidateToTransaction(candidate: SlipCandidate, options: CandidateImportOptions = {}): Transaction {
  const { defaultAccount = "Cash", fallbackTitle = "Slip", today = () => toLocalDateString(new Date()) } = options;

  const noteParts = [candidate.bankName, candidate.reference].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );

  return {
    title: candidate.merchant?.trim() || fallbackTitle,
    amount: candidate.amount ?? 0,
    type: "expense",
    account: defaultAccount,
    date: candidate.date ?? today(),
    time: candidate.time,
    note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
    status: "completed",
  };
}
