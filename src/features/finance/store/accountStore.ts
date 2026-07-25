import { create } from "zustand";
import { accountService } from "@/features/finance/services/accountService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Account } from "@/features/finance/types";

interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: number, account: Account) => Promise<void>;
  deleteAccount: (id: number, name: string) => Promise<void>;
  mergeAccount: (
    sourceId: number,
    sourceName: string,
    targetName: string
  ) => Promise<void>;
}

export const useAccountStore =
  create<AccountState>((set) => ({
    accounts: [],
    ...initialAsyncState,

    loadAccounts: async () => {
      set({ loading: true, error: null });

      try {
        const accounts = await accountService.list();
        set({ accounts, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    // Mutation failures deliberately don't touch `error` — see transactionStore
    // for why (mutation errors belong to the calling component, not the
    // shared list-load state).

    async addAccount(account) {
      await accountService.create(account);
      const accounts = await accountService.list();
      set({ accounts });
    },

    async updateAccount(id, account) {
      await accountService.update(id, account);
      const accounts = await accountService.list();
      set({ accounts });
    },

    async deleteAccount(id, name) {
      await accountService.remove(id, name);
      const accounts = await accountService.list();
      set({ accounts });
    },

    async mergeAccount(sourceId, sourceName, targetName) {
      await accountService.merge(sourceId, sourceName, targetName);
      const accounts = await accountService.list();
      set({ accounts });
    },
  }));
