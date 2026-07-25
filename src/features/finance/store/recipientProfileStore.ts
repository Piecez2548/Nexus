import { create } from "zustand";
import { recipientProfileService } from "@/features/finance/services/recipientProfileService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { RecipientProfile } from "@/features/finance/types";

interface RecipientProfileState {
  profiles: RecipientProfile[];
  loading: boolean;
  error: string | null;

  loadProfiles: () => Promise<void>;
  deleteProfile: (id: number) => Promise<void>;
}

export const useRecipientProfileStore =
  create<RecipientProfileState>((set) => ({
    profiles: [],
    ...initialAsyncState,

    loadProfiles: async () => {
      set({ loading: true, error: null });

      try {
        const profiles = await recipientProfileService.list();
        set({ profiles, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async deleteProfile(id) {
      await recipientProfileService.remove(id);
      const profiles = await recipientProfileService.list();
      set({ profiles });
    },
  }));
