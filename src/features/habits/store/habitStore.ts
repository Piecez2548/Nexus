import { create } from "zustand";
import { habitService } from "@/features/habits/services/habitService";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { toLocalDateString } from "@/features/habits/utils/streak";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Habit } from "@/features/habits/types";

interface HabitState {
  habits: Habit[];
  loading: boolean;
  error: string | null;

  loadHabits: () => Promise<void>;
  addHabit: (habit: Habit) => Promise<void>;
  updateHabit: (id: number, habit: Habit) => Promise<void>;
  deleteHabit: (id: number) => Promise<void>;
  checkIn: (id: number) => Promise<void>;
}

export const useHabitStore =
  create<HabitState>((set, get) => ({
    habits: [],
    ...initialAsyncState,

    loadHabits: async () => {
      set({ loading: true, error: null });

      try {
        const habits = await habitService.list();
        set({ habits, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addHabit(habit) {
      await habitService.create(habit);
      const habits = await habitService.list();
      set({ habits });
    },

    async updateHabit(id, habit) {
      await habitService.update(id, habit);
      const habits = await habitService.list();
      set({ habits });
    },

    async deleteHabit(id) {
      await habitService.remove(id);
      const habits = await habitService.list();
      set({ habits });
    },

    // Idempotent and additive-only — checking in a habit that's already
    // checked in today is a no-op (no duplicate date, no double XP). No
    // "undo today's check-in" in v1, matching Goal.contribute's
    // one-directional shape (Goals also has no way to undo a contribution).
    async checkIn(id) {
      const existing = get().habits.find((h) => h.id === id);
      if (!existing) return;

      const today = toLocalDateString(new Date());
      if (existing.completedDates.includes(today)) return;

      await habitService.update(id, {
        ...existing,
        completedDates: [...existing.completedDates, today],
      });
      useGamificationStore.getState().addXp(XP_REWARDS.habitCheckIn);

      const habits = await habitService.list();
      set({ habits });
    },
  }));
