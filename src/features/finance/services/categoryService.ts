import { categoryRepository } from "@/features/finance/repositories/categoryRepository";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import { budgetRepository } from "@/features/finance/repositories/budgetRepository";
import { translate } from "@/i18n/useTranslation";
import type { Category, Transaction } from "../types";

export const categoryService = {
  list: () => categoryRepository.getAll(),

  create: (category: Category) => categoryRepository.add(category),

  // Both transactions and budgets reference a category by its plain name
  // string, not an id (same convention as accountService.update() -- see
  // that comment for the full reasoning). remove() already guards against
  // both references; a plain rename via this Edit form previously cascaded
  // into neither, silently orphaning any transaction or budget still
  // holding the old name the moment it changed.
  async update(id: number, category: Category) {
    const existing = (await categoryRepository.getAll()).find((c) => c.id === id);

    if (existing !== undefined && existing.name !== category.name) {
      // budgets.category is a `&`-unique Dexie index (one budget per
      // category) -- renaming into a name that already has its own budget
      // would throw a constraint error partway through the cascade below,
      // leaving transactions already renamed but the category/budget not
      // yet updated. Checked and refused upfront, before any write, so this
      // never leaves a partially-renamed state.
      const budgets = await budgetRepository.getAll();
      const budgetToRename = budgets.find((b) => b.category === existing.name);
      if (budgetToRename && budgets.some((b) => b.category === category.name)) {
        throw new Error(translate("categories.renameBudgetCollisionError"));
      }

      const transactions = await transactionRepository.getAll();
      await Promise.all(
        transactions
          .filter((t) => t.category === existing.name)
          .map((t) => {
            const next: Transaction = { ...t, category: category.name };
            return next.id !== undefined ? transactionRepository.update(next.id, next) : undefined;
          })
      );

      if (budgetToRename?.id !== undefined) {
        await budgetRepository.update(budgetToRename.id, { ...budgetToRename, category: category.name });
      }
    }

    return categoryRepository.update(id, category);
  },

  async remove(id: number, categoryName: string) {
    const transactions = await transactionRepository.getAll();
    const inUseByTransaction = transactions.some((t) => t.category === categoryName);

    if (inUseByTransaction) {
      throw new Error(translate("categories.deleteInUseError"));
    }

    // A category with zero transactions can still have a Budget scoped to
    // it (budgets.category has its own unique Dexie index, independent of
    // whether any spend has happened yet) -- without this check, deleting
    // it would silently orphan that budget, leaving it referencing a
    // category name that no longer exists anywhere.
    const budgets = await budgetRepository.getAll();
    const inUseByBudget = budgets.some((b) => b.category === categoryName);

    if (inUseByBudget) {
      throw new Error(translate("categories.deleteInUseByBudgetError"));
    }

    await categoryRepository.remove(id);
  },

  // Reassigns every transaction using `sourceCategoryName` to
  // `targetCategoryName`, then removes the now-empty source category.
  //
  // Accepts an optional pre-fetched transaction list and returns the
  // updated one, mirroring accountService.merge()'s exact reasoning --
  // lets a caller merging several duplicates in one pass fetch the full
  // table once and thread the updated view through each sequential call.
  async merge(
    sourceCategoryId: number,
    sourceCategoryName: string,
    targetCategoryName: string,
    transactions?: Transaction[]
  ): Promise<Transaction[]> {
    const list = transactions ?? (await transactionRepository.getAll());

    const updated = await Promise.all(
      list.map(async (t) => {
        if (t.category !== sourceCategoryName) return t;

        const next: Transaction = { ...t, category: targetCategoryName };
        if (next.id !== undefined) await transactionRepository.update(next.id, next);
        return next;
      })
    );

    await categoryRepository.remove(sourceCategoryId);
    return updated;
  },
};
