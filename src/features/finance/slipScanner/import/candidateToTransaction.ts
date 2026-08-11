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
  // The user's current category names (from categoryStore). When provided, a
  // categorize() guess that isn't one of them (renamed/deleted by the user, or
  // just not seeded — e.g. the categoriser's "Healthcare"/"Bills" vs. the
  // default seed's "Health"/"Utilities") falls back to "Others" if that
  // exists, else is left unset — never persisted as an orphan category string.
  validCategoryNames?: Set<string>;
}

function resolveCategory(guess: SlipCategory, validCategoryNames: Set<string> | undefined): string | undefined {
  if (!validCategoryNames || validCategoryNames.has(guess)) return guess;
  return validCategoryNames.has("Others") ? "Others" : undefined;
}

// Pure mapping from a scanned slip candidate to a transaction draft. Slips are
// outgoing payments, so they import as completed expenses. The title prefers the
// merchant, then the bank name, then the fallback (so a slip is never just
// "Item from slip" when we know the bank); the category is auto-assigned from
// that same merchant/bank text (GS-043) so the row isn't left uncategorised.
// Bank + reference go into the note for traceability; the date falls back to
// today.
export function candidateToTransaction(candidate: SlipCandidate, options: CandidateImportOptions = {}): Transaction {
  const {
    defaultAccount = "Cash",
    fallbackTitle = "Slip",
    today = () => toLocalDateString(new Date()),
    learnedCategories,
    validCategoryNames,
  } = options;

  const title = candidate.merchant?.trim() || candidate.bankName?.trim() || fallbackTitle;

  const noteParts = [candidate.bankName, candidate.reference].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );

  // `title` is already merchant → bank → fallback, so it is the right
  // categorisation signal (categorising the fallback title is harmless — it has
  // no keyword hits and resolves to "Others").
  const guessedCategory = categorize(title, learnedCategories).category;

  return {
    title,
    amount: candidate.amount ?? 0,
    type: "expense",
    account: defaultAccount,
    category: resolveCategory(guessedCategory, validCategoryNames),
    date: candidate.date ?? today(),
    time: candidate.time,
    note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
    status: "completed",
  };
}
