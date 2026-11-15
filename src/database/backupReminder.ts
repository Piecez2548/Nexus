// Pure decision logic for the "back up your data" reminder. Nexus is
// local-first, so an unsynced device that is lost or wiped takes the user's
// only copy with it -- this decides when that's worth a nudge. No clock
// access here: callers pass `now` so the result stays deterministic.
export const BACKUP_STALE_DAYS = 14;
export const BACKUP_SNOOZE_DAYS = 7;
// Don't nag someone who has barely started using the app.
export const BACKUP_MIN_TRANSACTIONS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type BackupReminder =
  | { kind: "never" }
  | { kind: "stale"; daysSince: number };

export interface BackupReminderInput {
  lastBackupAt: string | null;
  snoozedUntil: string | null;
  transactionCount: number;
  // When this device last completed a cloud sync while signed in, or null.
  // A recent sync means the data already has an off-device copy, so a manual
  // export isn't urgent.
  lastSyncedAt?: string | null;
  now: Date;
}

export function getBackupReminder({
  lastBackupAt,
  snoozedUntil,
  transactionCount,
  lastSyncedAt = null,
  now,
}: BackupReminderInput): BackupReminder | null {
  if (transactionCount < BACKUP_MIN_TRANSACTIONS) return null;

  const snoozeEnd = snoozedUntil ? Date.parse(snoozedUntil) : NaN;
  if (Number.isFinite(snoozeEnd) && now.getTime() < snoozeEnd) return null;

  const synced = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  if (Number.isFinite(synced) && now.getTime() - synced < BACKUP_STALE_DAYS * DAY_MS) return null;

  const last = lastBackupAt ? Date.parse(lastBackupAt) : NaN;
  if (!Number.isFinite(last)) return { kind: "never" };

  const daysSince = Math.floor((now.getTime() - last) / DAY_MS);
  return daysSince >= BACKUP_STALE_DAYS ? { kind: "stale", daysSince } : null;
}

export function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * DAY_MS).toISOString();
}
