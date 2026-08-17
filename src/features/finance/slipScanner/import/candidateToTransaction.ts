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

// Pure mapping from a scanned slip candidate to a transaction draft. Slips
// are always outgoing payments, so a scanned slip candidate (which never
// sets `type`) still defaults to "expense" here. Payment Notification
// Capture is the one source where that assumption doesn't hold — a
// notification can be an incoming payment too — so it sets `type` explicitly
// and that wins. The title prefers the merchant, then the bank name, then
// the fallback (so a slip is never just "Item from slip" when we know the
// bank); the category is auto-assigned from that same merchant/bank text
// (GS-043) so the row isn't left uncategorised. Bank + reference go into the
// note for traceability; the date falls back to
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
  const type = candidate.type ?? "expense";

  // Bank name alone isn't worth a note -- it's already redundant with the
  // bank badge shown elsewhere (Import Preview, the notification-capture
  // confirm sheet) and with the title itself, which already falls back to
  // the bank name when there's no merchant. A note only earns its place
  // when there's a reference number to go with it (the actual reason this
  // field exists — reconciling against the bank's own transaction record).
  const noteParts = candidate.reference
    ? [candidate.bankName, candidate.reference].filter(
        (part): part is string => typeof part === "string" && part.trim() !== "",
      )
    : [];

  // `title` is already merchant → bank → fallback, so it is the right
  // categorisation signal (categorising the fallback title is harmless — it has
  // no keyword hits and resolves to "Others"). The categorizer's keyword rules
  // are expense-oriented (Food, Transport, Bills, ...), so only guess for an
  // expense -- applying it to an income candidate (Payment Notification
  // Capture only) would hand back an expense-shaped category name for an
  // income row. Left unset, the same as any other unresolvable guess.
  const guessedCategory = type === "expense" ? categorize(title, learnedCategories).category : undefined;
  // A Review Queue correction is a person's explicit choice from their own
  // live category list — trust it directly, skip the guess-validation path.
  const category =
    candidate.category?.trim() || (guessedCategory !== undefined ? resolveCategory(guessedCategory, validCategoryNames) : undefined);

  return {
    title,
    amount: candidate.amount ?? 0,
    type,
    account: defaultAccount,
    category,
    date: candidate.date ?? today(),
    time: candidate.time,
    note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
    status: "completed",
  };
}
