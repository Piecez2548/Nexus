import { merchantRepository } from "@/features/finance/repositories/merchantRepository";
import { translate } from "@/i18n/useTranslation";
import type { Merchant } from "@/features/finance/types";

// merchants.name carries a `&`-unique Dexie index -- checked upfront here so
// a duplicate name surfaces as a translated, friendly error instead of a
// raw Dexie ConstraintError.
async function assertNameAvailable(name: string, excludeId?: number): Promise<void> {
  const existing = await merchantRepository.getAll();
  const collision = existing.some((m) => m.name === name && m.id !== excludeId);
  if (collision) throw new Error(translate("merchants.duplicateNameError"));
}

export const merchantService = {
  list: () => merchantRepository.getAll(),

  async create(merchant: Merchant): Promise<number> {
    await assertNameAvailable(merchant.name);
    return merchantRepository.add(merchant);
  },

  async update(id: number, merchant: Merchant): Promise<number> {
    await assertNameAvailable(merchant.name, id);
    return merchantRepository.update(id, merchant);
  },

  // No delete guard needed: categorySuggestionService looks merchants up by
  // a fresh name match at suggestion time, not a stored id/name reference
  // (unlike Category/Account, nothing else in the app persists a pointer to
  // a specific merchant row) -- removing one just removes that suggestion
  // source, nothing is left orphaned.
  remove: (id: number) => merchantRepository.remove(id),
};
