import { create } from "zustand";
import { transactionTemplateService } from "@/features/finance/services/transactionTemplateService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { TransactionTemplate } from "@/features/finance/types";

interface TransactionTemplateState {
  templates: TransactionTemplate[];
  loading: boolean;
  error: string | null;

  loadTemplates: () => Promise<void>;
  addTemplate: (template: TransactionTemplate) => Promise<void>;
  updateTemplate: (id: number, template: TransactionTemplate) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;
}

export const useTransactionTemplateStore = create<TransactionTemplateState>((set) => ({
  templates: [],
  ...initialAsyncState,

  loadTemplates: async () => {
    set({ loading: true, error: null });

    try {
      const templates = await transactionTemplateService.list();
      set({ templates, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  // Mutation failures are intentionally NOT written to `error` — see
  // transactionStore.ts for the reasoning behind this pattern.

  async addTemplate(template) {
    await transactionTemplateService.create(template);
    const templates = await transactionTemplateService.list();
    set({ templates });
  },

  async updateTemplate(id, template) {
    await transactionTemplateService.update(id, template);
    const templates = await transactionTemplateService.list();
    set({ templates });
  },

  async deleteTemplate(id) {
    await transactionTemplateService.remove(id);
    const templates = await transactionTemplateService.list();
    set({ templates });
  },
}));
