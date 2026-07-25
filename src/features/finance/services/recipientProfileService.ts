import { recipientProfileRepository } from "@/features/finance/repositories/recipientProfileRepository";
import type { RecipientProfile } from "../types";

// Learning Engine: every time a transaction with a recipient is saved,
// this upserts that recipient's profile — bumping its transaction count,
// running total, last-used date, and confidence score. The Rule Engine
// (categorySuggestionService) reads these profiles back to auto-categorize
// future transactions from the same recipient.
function computeConfidence(transactionCount: number): number {
  return Math.round((transactionCount / (transactionCount + 1)) * 100);
}

export const recipientProfileService = {
  list: () => recipientProfileRepository.getAll(),

  remove: (id: number) => recipientProfileRepository.remove(id),

  async recordUsage(params: {
    recipientKey: string;
    alias: string;
    category: string;
    account?: string;
    amount: number;
    date: string;
  }): Promise<void> {
    const { recipientKey, alias, category, account, amount, date } = params;
    const existing = await recipientProfileRepository.getByKey(recipientKey);

    if (existing?.id !== undefined) {
      const transactionCount = existing.transactionCount + 1;

      await recipientProfileRepository.update(existing.id, {
        ...existing,
        category,
        account,
        transactionCount,
        totalAmount: existing.totalAmount + amount,
        lastUsedDate: date,
        confidenceScore: computeConfidence(transactionCount),
      });
      return;
    }

    const profile: RecipientProfile = {
      recipientKey,
      alias,
      category,
      account,
      transactionCount: 1,
      totalAmount: amount,
      lastUsedDate: date,
      confidenceScore: computeConfidence(1),
    };

    await recipientProfileRepository.add(profile);
  },
};
