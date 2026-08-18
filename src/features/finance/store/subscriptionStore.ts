import { create } from "zustand";
import { subscriptionService } from "@/features/finance/services/subscriptionService";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Subscription } from "@/features/finance/types";

interface SubscriptionState {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;

  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: Subscription) => Promise<void>;
  updateSubscription: (id: number, subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: number) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscriptions: [],
  ...initialAsyncState,

  loadSubscriptions: async () => {
    set({ loading: true, error: null });

    try {
      const subscriptions = await subscriptionService.list();
      set({ subscriptions, loading: false });
    } catch (err) {
      set({ loading: false, error: toErrorMessage(err) });
    }
  },

  async addSubscription(subscription) {
    await subscriptionService.create(subscription);
    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },

  async updateSubscription(id, subscription) {
    await subscriptionService.update(id, subscription);
    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },

  async deleteSubscription(id) {
    await subscriptionService.remove(id);
    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },
}));
