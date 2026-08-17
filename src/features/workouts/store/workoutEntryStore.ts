import { create } from "zustand";
import { workoutEntryService } from "@/features/workouts/services/workoutEntryService";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { WorkoutEntry } from "@/features/workouts/types";

interface WorkoutEntryState {
  entries: WorkoutEntry[];
  loading: boolean;
  error: string | null;

  loadEntries: () => Promise<void>;
  addEntry: (entry: WorkoutEntry) => Promise<void>;
  updateEntry: (id: number, entry: WorkoutEntry) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
}

export const useWorkoutEntryStore =
  create<WorkoutEntryState>((set) => ({
    entries: [],
    ...initialAsyncState,

    loadEntries: async () => {
      set({ loading: true, error: null });

      try {
        const entries = await workoutEntryService.list();
        set({ entries, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addEntry(entry) {
      await workoutEntryService.create(entry);
      useGamificationStore.getState().addXp(XP_REWARDS.workoutLogged);

      const entries = await workoutEntryService.list();
      set({ entries });
    },

    async updateEntry(id, entry) {
      await workoutEntryService.update(id, entry);
      const entries = await workoutEntryService.list();
      set({ entries });
    },

    async deleteEntry(id) {
      await workoutEntryService.remove(id);
      const entries = await workoutEntryService.list();
      set({ entries });
    },
  }));
