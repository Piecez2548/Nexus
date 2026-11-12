import { create } from "zustand";
import { persist } from "zustand/middleware";

// Opt-in (default off): save high-confidence payment notifications without
// asking. Local preference only.
interface NotificationAutoSaveState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useNotificationAutoSaveStore = create<NotificationAutoSaveState>()(
  persist((set) => ({ enabled: false, setEnabled: (enabled) => set({ enabled }) }), { name: "nexus-notification-autosave" }),
);
