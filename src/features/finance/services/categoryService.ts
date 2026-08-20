import { categoryRepository } from "@/features/finance/repositories/categoryRepository";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import { budgetRepository } from "@/features/finance/repositories/budgetRepository";
import { translate } from "@/i18n/useTranslation";
import type { Category, Transaction } from "../types";

export const categoryService = {
  list: () => categoryRepository.getAll(),

  create: (category: Category) => categoryRepository.add(category),

  update: (id: number, category: Category) =>
    categoryRepository.update(id, category),

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
