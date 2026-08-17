import { create } from "zustand";
import { vaultEntryService } from "@/features/vault/services/vaultEntryService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { VaultEntry } from "@/features/vault/types";

interface VaultEntryState {
  entries: VaultEntry[];
  loading: boolean;
  error: string | null;

  loadEntries: () => Promise<void>;
  addEntry: (entry: VaultEntry) => Promise<void>;
  updateEntry: (id: number, entry: VaultEntry) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
}

export const useVaultEntryStore = create<VaultEntryState>((set) => ({
  entries: [],
  ...initialAsyncState,

  loadEntries: async () => {
    set({ loading: true, error: null });

    try {
      const entries = await vaultEntryService.list();
      set({ entries, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addEntry(entry) {
    await vaultEntryService.create(entry);
    const entries = await vaultEntryService.list();
    set({ entries });
  },

  async updateEntry(id, entry) {
    await vaultEntryService.update(id, entry);
    const entries = await vaultEntryService.list();
    set({ entries });
  },

  async deleteEntry(id) {
    await vaultEntryService.remove(id);
    const entries = await vaultEntryService.list();
    set({ entries });
  },
}));
