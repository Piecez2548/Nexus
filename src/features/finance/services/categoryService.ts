import { categoryRepository } from "@/features/finance/repositories/categoryRepository";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import { translate } from "@/i18n/useTranslation";
import type { Category } from "../types";

export const categoryService = {
  list: () => categoryRepository.getAll(),

  create: (category: Category) => categoryRepository.add(category),

  update: (id: number, category: Category) =>
    categoryRepository.update(id, category),

  async remove(id: number, categoryName: string) {
    const transactions = await transactionRepository.getAll();
    const inUse = transactions.some((t) => t.category === categoryName);

    if (inUse) {
      throw new Error(translate("categories.deleteInUseError"));
    }

    await categoryRepository.remove(id);
  },

  // Reassigns every transaction using `sourceCategoryName` to
  // `targetCategoryName`, then removes the now-empty source category.
  async merge(
    sourceCategoryId: number,
    sourceCategoryName: string,
    targetCategoryName: string
  ) {
    const transactions = await transactionRepository.getAll();
    const affected = transactions.filter(
      (t) => t.category === sourceCategoryName
    );

    await Promise.all(
      affected
        .filter((t) => t.id !== undefined)
        .map((t) =>
          transactionRepository.update(t.id as number, {
            ...t,
            category: targetCategoryName,
          })
        )
    );

    await categoryRepository.remove(sourceCategoryId);
  },
};
