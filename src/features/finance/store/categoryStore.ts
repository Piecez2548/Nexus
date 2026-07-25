import { create } from "zustand";
import { categoryService } from "@/features/finance/services/categoryService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Category } from "@/features/finance/types";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;

  loadCategories: () => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: number, category: Category) => Promise<void>;
  deleteCategory: (id: number, name: string) => Promise<void>;
  mergeCategory: (
    sourceId: number,
    sourceName: string,
    targetName: string
  ) => Promise<void>;
}

export const useCategoryStore =
  create<CategoryState>((set) => ({
    categories: [],
    ...initialAsyncState,

    loadCategories: async () => {
      set({ loading: true, error: null });

      try {
        const categories = await categoryService.list();
        set({ categories, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    // Mutation failures deliberately don't touch `error` — see transactionStore.

    async addCategory(category) {
      await categoryService.create(category);
      const categories = await categoryService.list();
      set({ categories });
    },

    async updateCategory(id, category) {
      await categoryService.update(id, category);
      const categories = await categoryService.list();
      set({ categories });
    },

    async deleteCategory(id, name) {
      await categoryService.remove(id, name);
      const categories = await categoryService.list();
      set({ categories });
    },

    async mergeCategory(sourceId, sourceName, targetName) {
      await categoryService.merge(sourceId, sourceName, targetName);
      const categories = await categoryService.list();
      set({ categories });
    },
  }));
