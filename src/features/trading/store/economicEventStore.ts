import { create } from "zustand";
import { economicEventService } from "@/features/trading/services/economicEventService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { EconomicEvent } from "@/features/trading/types";

interface EconomicEventState {
  economicEvents: EconomicEvent[];
  loading: boolean;
  error: string | null;

  loadEconomicEvents: () => Promise<void>;
  addEconomicEvent: (event: EconomicEvent) => Promise<void>;
  updateEconomicEvent: (id: number, event: EconomicEvent) => Promise<void>;
  deleteEconomicEvent: (id: number) => Promise<void>;
}

export const useEconomicEventStore = create<EconomicEventState>((set) => ({
  economicEvents: [],
  ...initialAsyncState,

  loadEconomicEvents: async () => {
    set({ loading: true, error: null });

    try {
      const economicEvents = await economicEventService.list();
      set({ economicEvents, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addEconomicEvent(event) {
    await economicEventService.create(event);
    const economicEvents = await economicEventService.list();
    set({ economicEvents });
  },

  async updateEconomicEvent(id, event) {
    await economicEventService.update(id, event);
    const economicEvents = await economicEventService.list();
    set({ economicEvents });
  },

  async deleteEconomicEvent(id) {
    await economicEventService.remove(id);
    const economicEvents = await economicEventService.list();
    set({ economicEvents });
  },
}));
