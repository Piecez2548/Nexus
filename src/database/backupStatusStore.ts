import { create } from "zustand";
import { persist } from "zustand/middleware";

import { addDays, BACKUP_SNOOZE_DAYS } from "@/database/backupReminder";

// Local, device-only record of the last manual backup export -- mirrors
// riskConfigStore's pattern (persist to localStorage, no Dexie table, no
// sync). Deliberately not synced: "this device was backed up" is a fact
// about this device only.
interface BackupStatusState {
  lastBackupAt: string | null;
  snoozedUntil: string | null;

  markBackedUp: (now?: Date) => void;
  snooze: (now?: Date) => void;
}

export const useBackupStatusStore = create<BackupStatusState>()(
  persist(
    (set) => ({
      lastBackupAt: null,
      snoozedUntil: null,

      markBackedUp: (now = new Date()) => set({ lastBackupAt: now.toISOString(), snoozedUntil: null }),
      snooze: (now = new Date()) => set({ snoozedUntil: addDays(now, BACKUP_SNOOZE_DAYS) }),
    }),
    { name: "nexus-backup-status" }
  )
);
