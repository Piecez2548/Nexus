import { recipientProfileRepository } from "@/features/finance/repositories/recipientProfileRepository";
import { merchantRepository } from "@/features/finance/repositories/merchantRepository";

export interface CategorySuggestion {
  category: string;
  account?: string;
  source: "recipient" | "merchant";
  confidence: number;
  label: string;
}

// Rule Engine: suggests a category before the user has to pick one.
// A known recipient (learned from this user's own history) always wins;
// falling back to the static merchant database when the recipient is new
// or wasn't provided, matched against the transaction title.
export const categorySuggestionService = {
  async suggest(
    recipientKey: string | undefined,
    title: string
  ): Promise<CategorySuggestion | null> {
    if (recipientKey) {
      const profile = await recipientProfileRepository.getByKey(recipientKey);

      if (profile) {
        return {
          category: profile.category,
          account: profile.account,
          source: "recipient",
          confidence: profile.confidenceScore,
          label: profile.alias,
        };
      }
    }

    const normalizedTitle = title.trim().toLowerCase();
    if (!normalizedTitle) return null;

    const merchants = await merchantRepository.getAll();
    const matched = merchants.find((m) =>
      normalizedTitle.includes(m.name.toLowerCase())
    );

    if (!matched) return null;

    return {
      category: matched.category,
      source: "merchant",
      confidence: 50,
      label: matched.name,
    };
  },
};
