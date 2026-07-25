import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  dismissedIds: string[];
  dismiss: (id: string) => void;
}

// Notifications themselves are derived fresh from live data on every render
// (see useNotifications) rather than stored — only which ones the user has
// already dismissed needs to persist.
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      dismissedIds: [],

      dismiss: (id) => {
        if (get().dismissedIds.includes(id)) return;
        set({ dismissedIds: [...get().dismissedIds, id] });
      },
    }),
    { name: "nexus-dismissed-notifications" }
  )
);
