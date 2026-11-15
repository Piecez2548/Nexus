import { describe, expect, it } from "vitest";

import { getBackupReminder } from "./backupReminder";

const now = new Date("2026-10-31T12:00:00.000Z");
const base = { lastBackupAt: null, snoozedUntil: null, transactionCount: 20, now };

describe("getBackupReminder", () => {
  it("stays quiet for users with almost no data", () => {
    expect(getBackupReminder({ ...base, transactionCount: 4 })).toBeNull();
  });

  it("reminds users who have never backed up", () => {
    expect(getBackupReminder(base)).toEqual({ kind: "never" });
  });

  it("treats an unparseable timestamp as never backed up", () => {
    expect(getBackupReminder({ ...base, lastBackupAt: "garbage" })).toEqual({ kind: "never" });
  });

  it("stays quiet for a recent backup", () => {
    expect(getBackupReminder({ ...base, lastBackupAt: "2026-10-20T12:00:00.000Z" })).toBeNull();
  });

  it("reminds once the backup is 14 days old", () => {
    expect(getBackupReminder({ ...base, lastBackupAt: "2026-10-17T12:00:00.000Z" })).toEqual({
      kind: "stale",
      daysSince: 14,
    });
    expect(getBackupReminder({ ...base, lastBackupAt: "2026-10-18T12:00:00.000Z" })).toBeNull();
  });

  it("respects an active snooze and resumes after it ends", () => {
    expect(getBackupReminder({ ...base, snoozedUntil: "2026-11-02T12:00:00.000Z" })).toBeNull();
    expect(getBackupReminder({ ...base, snoozedUntil: "2026-10-30T12:00:00.000Z" })).toEqual({ kind: "never" });
  });

  it("stays quiet while a recent cloud sync already holds an off-device copy", () => {
    expect(getBackupReminder({ ...base, lastSyncedAt: "2026-10-31T11:00:00.000Z" })).toBeNull();
  });

  it("reminds again when the last sync is older than the stale window", () => {
    expect(getBackupReminder({ ...base, lastSyncedAt: "2026-10-01T00:00:00.000Z" })).toEqual({ kind: "never" });
  });
});
