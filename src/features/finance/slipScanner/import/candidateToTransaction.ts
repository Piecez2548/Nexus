import { categorize, type SlipCategory } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";
import { toLocalDateString } from "@/utils/localDate";

export interface CandidateImportOptions {
  // Default account for imported slips (slips don't say which account paid).
  defaultAccount?: string;
  // Title used when the slip has neither a merchant nor a bank (UI passes a
  // translated string).
  fallbackTitle?: string;
  // Injectable clock so "today" is deterministic in tests.
  today?: () => string;
  // Learned category corrections (GS-043) to bias auto-categorisation.
  learnedCategories?: Map<string, SlipCategory>;
}

// Pure mapping from a scanned slip candidate to a transaction draft. Slips are
// outgoing payments, so they import as completed expenses. The title prefers the
// merchant, then the bank name, then the fallback (so a slip is never just
// "Item from slip" when we know the bank); the category is auto-assigned from
// the merchant/bank text (GS-043) so the row isn't left uncategorised. Bank +
// reference go into the note for traceability; the date falls back to today.
export function candidateToTransaction(candidate: SlipCandidate, options: CandidateImportOptions = {}): Transaction {
  const { defaultAccount = "Cash", fallbackTitle = "Slip", today = () => toLocalDateString(new Date()), learnedCategories } = options;

  const title = candidate.merchant?.trim() || candidate.bankName?.trim() || fallbackTitle;

  const noteParts = [candidate.bankName, candidate.reference].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );

  return {
    title,
    amount: candidate.amount ?? 0,
    type: "expense",
    account: defaultAccount,
    category: categorize(candidate.merchant ?? candidate.bankName ?? title, learnedCategories).category,
    date: candidate.date ?? today(),
    time: candidate.time,
    note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
    status: "completed",
  };
}
