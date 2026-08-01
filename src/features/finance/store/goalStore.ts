import { create } from "zustand";
import { goalService } from "@/features/finance/services/goalService";
import { checkAndLogCrossings } from "@/features/finance/services/goalMilestoneService";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Goal } from "@/features/finance/types";

interface GoalState {
  goals: Goal[];
  loading: boolean;
  error: string | null;

  loadGoals: () => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (id: number, goal: Goal) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  contribute: (id: number, amount: number) => Promise<void>;
}

export const useGoalStore =
  create<GoalState>((set, get) => ({
    goals: [],
    ...initialAsyncState,

    loadGoals: async () => {
      set({ loading: true, error: null });

      try {
        const goals = await goalService.list();
        set({ goals, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addGoal(goal) {
      await goalService.create(goal);
      const goals = await goalService.list();
      set({ goals });
    },

    async updateGoal(id, goal) {
      const previousAmount = get().goals.find((g) => g.id === id)?.currentAmount ?? goal.currentAmount;

      await goalService.update(id, goal);
      const goals = await goalService.list();
      set({ goals });

      const updated = goals.find((g) => g.id === id);
      if (updated) await checkAndLogCrossings(updated, previousAmount);
    },

    async deleteGoal(id) {
      await goalService.remove(id);
      const goals = await goalService.list();
      set({ goals });
    },

    async contribute(id, amount) {
      const goal = get().goals.find((g) => g.id === id);
      if (!goal) return;

      const newAmount = goal.currentAmount + amount;
      await goalService.update(id, {
        ...goal,
        currentAmount: newAmount,
      });

      const wasComplete = goal.currentAmount >= goal.targetAmount;
      const isNowComplete = newAmount >= goal.targetAmount;
      useGamificationStore
        .getState()
        .addXp(XP_REWARDS.goalContribution + (isNowComplete && !wasComplete ? XP_REWARDS.goalCompletedBonus : 0));

      const goals = await goalService.list();
      set({ goals });

      const updated = goals.find((g) => g.id === id);
      if (updated) await checkAndLogCrossings(updated, goal.currentAmount);
    },
  }));
