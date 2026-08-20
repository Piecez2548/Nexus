import { create } from "zustand";
import { merchantService } from "@/features/finance/services/merchantService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Merchant } from "@/features/finance/types";

interface MerchantState {
  merchants: Merchant[];
  loading: boolean;
  error: string | null;

  loadMerchants: () => Promise<void>;
  addMerchant: (merchant: Merchant) => Promise<void>;
  updateMerchant: (id: number, merchant: Merchant) => Promise<void>;
  deleteMerchant: (id: number) => Promise<void>;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchants: [],
  ...initialAsyncState,

  loadMerchants: async () => {
    set({ loading: true, error: null });

    try {
      const merchants = await merchantService.list();
      set({ merchants, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  // Mutation failures deliberately don't touch `error` -- see transactionStore.

  async addMerchant(merchant) {
    await merchantService.create(merchant);
    const merchants = await merchantService.list();
    set({ merchants });
  },

  async updateMerchant(id, merchant) {
    await merchantService.update(id, merchant);
    const merchants = await merchantService.list();
    set({ merchants });
  },

  async deleteMerchant(id) {
    await merchantService.remove(id);
    const merchants = await merchantService.list();
    set({ merchants });
  },
}));
