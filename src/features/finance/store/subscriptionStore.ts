import { create } from "zustand";

import { subscriptionService } from "@/features/finance/services/subscriptionService";
import { reminderFireTime } from "@/features/finance/utils/subscriptionMath";
import { scheduleReminder, cancelReminder } from "@/features/reminders/services/nativeReminderService";
import { REMINDER_NAMESPACE } from "@/features/reminders/types";
import { translate } from "@/i18n/useTranslation";
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

async function reminderFor(subscription: Subscription) {
  if (!subscription.reminderEnabled || subscription.status !== "active" || subscription.id === undefined) return;

  const at = reminderFireTime(subscription.nextBillingDate);
  if (at.getTime() <= Date.now()) return; // already past -- nothing to schedule

  await scheduleReminder({
    namespace: REMINDER_NAMESPACE.subscription,
    entityId: subscription.id,
    title: translate("subscriptions.reminderTitle"),
    body: translate("subscriptions.reminderBody", { name: subscription.name, amount: subscription.amount }),
    repeat: { frequency: "once", at: at.toISOString() },
  });
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
    const id = await subscriptionService.create(subscription);
    await reminderFor({ ...subscription, id });

    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },

  async updateSubscription(id, subscription) {
    // Always cancel first, then reschedule if still enabled -- simpler and
    // safer than diffing old vs. new reminder settings (mirrors
    // habitStore.updateHabit's exact same reasoning).
    await cancelReminder(REMINDER_NAMESPACE.subscription, id);
    await subscriptionService.update(id, subscription);
    await reminderFor({ ...subscription, id });

    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },

  async deleteSubscription(id) {
    await cancelReminder(REMINDER_NAMESPACE.subscription, id);
    await subscriptionService.remove(id);
    const subscriptions = await subscriptionService.list();
    set({ subscriptions });
  },
}));
