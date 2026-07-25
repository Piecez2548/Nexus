import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useToastStore } from "@/store/toastStore";
import { getLevel } from "@/utils/leveling";

interface GamificationState {
  xp: number;
  streak: number;
  lastActiveDate: string | null;

  addXp: (amount: number) => void;
  recordActivity: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: 0,
      lastActiveDate: null,

      addXp(amount) {
        const { xp } = get();
        const previousLevel = getLevel(xp);
        const nextXp = xp + amount;
        const newLevel = getLevel(nextXp);

        set({ xp: nextXp });
        get().recordActivity();

        if (newLevel > previousLevel) {
          useToastStore.getState().show("success", `🎉 เลเวลอัพ! ตอนนี้คุณอยู่ Lv.${newLevel}`);
        }
      },

      recordActivity() {
        const today = todayIso();
        const { lastActiveDate, streak } = get();
        if (lastActiveDate === today) return;

        const newStreak = lastActiveDate === yesterdayIso() ? streak + 1 : 1;
        set({ streak: newStreak, lastActiveDate: today });
      },
    }),
    { name: "nexus-gamification" }
  )
);
