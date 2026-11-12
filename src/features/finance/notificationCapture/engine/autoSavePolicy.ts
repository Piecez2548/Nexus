import { categoryLearningKey, type SlipCategory } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Deliberately strict: a payment notification is saved without asking only
// when every signal is present -- the bank app is known, the amount parsed,
// and the counterparty is one the person has already categorised before
// (so the category is their own choice, not a guess). Notification text
// carries no income/expense direction, so only outgoing-style notifications
// (those with a "to <name>" counterparty) can qualify. Anything else keeps
// the existing one-tap confirm sheet.
export function isHighConfidenceNotification(
  candidate: SlipCandidate,
  learned: ReadonlyMap<string, SlipCategory>,
): boolean {
  const merchant = candidate.merchant?.trim();
  return (
    candidate.source === "notification" &&
    !!candidate.bankId &&
    candidate.amount !== undefined &&
    candidate.amount > 0 &&
    !!merchant &&
    learned.has(categoryLearningKey(merchant))
  );
}
