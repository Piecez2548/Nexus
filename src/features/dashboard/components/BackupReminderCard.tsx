import { Link } from "react-router-dom";
import { DatabaseBackup, X } from "lucide-react";

import { getBackupReminder } from "@/database/backupReminder";
import { useBackupStatusStore } from "@/database/backupStatusStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";

// Renders nothing unless getBackupReminder says a nudge is due -- same
// "return null until there's something worth showing" precedent as
// WeeklyDigestCard. The action just routes to Settings > Data, where the
// existing export (and its native share-sheet handling) already lives.
export default function BackupReminderCard({ transactionCount }: { transactionCount: number }) {
  const { t } = useTranslation();
  const lastBackupAt = useBackupStatusStore((s) => s.lastBackupAt);
  const snoozedUntil = useBackupStatusStore((s) => s.snoozedUntil);
  const snooze = useBackupStatusStore((s) => s.snooze);
  // lastSyncedAt is cleared on sign-out, so it only suppresses the reminder
  // while an account is actually syncing this device's data.
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);

  const reminder = getBackupReminder({ lastBackupAt, snoozedUntil, transactionCount, lastSyncedAt, now: new Date() });
  if (!reminder) return null;

  const isNever = reminder.kind === "never";

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30"
    >
      <DatabaseBackup size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />

      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">
          {t(isNever ? "settings.backupReminderNeverTitle" : "settings.backupReminderStaleTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isNever
            ? t("settings.backupReminderNeverBody")
            : t("settings.backupReminderStaleBody", { days: reminder.daysSince })}
        </p>
        <Link
          to="/settings"
          className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          {t("settings.backupReminderAction")}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => snooze()}
        aria-label={t("settings.backupReminderSnooze")}
        title={t("settings.backupReminderSnooze")}
        className="shrink-0 rounded-full p-1.5 text-zinc-400 transition hover:bg-amber-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <X size={16} />
      </button>
    </div>
  );
}
