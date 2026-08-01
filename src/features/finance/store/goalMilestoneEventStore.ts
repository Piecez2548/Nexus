import { create } from "zustand";
import { goalMilestoneEventService } from "@/features/finance/services/goalMilestoneEventService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { GoalMilestoneEvent } from "@/features/finance/types";

interface GoalMilestoneEventState {
  events: GoalMilestoneEvent[];
  loading: boolean;
  error: string | null;

  loadEvents: () => Promise<void>;
}

export const useGoalMilestoneEventStore = create<GoalMilestoneEventState>((set) => ({
  events: [],
  ...initialAsyncState,

  loadEvents: async () => {
    set({ loading: true, error: null });

    try {
      const events = await goalMilestoneEventService.list();
      set({ events, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },
}));
