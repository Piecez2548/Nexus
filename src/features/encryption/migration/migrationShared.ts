import { db } from "@/database/db";
import type { SyncTableName } from "@/features/sync/types";

// Mirrors src/features/sync/types.ts's SyncTableName union as an explicit
// local list, rather than importing syncEngine.ts's private SYNCED_TABLES
// constant — keeps this migration from requiring any change to the sync
// engine itself (it needs none — see syncEngine.test.ts's opaque-blob
// contract test). Shared between enableEncryption.ts and disableEncryption.ts
// so the table list has exactly one source of truth for both directions.
export const ENCRYPTABLE_TABLES: SyncTableName[] = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
  "habits",
  "holdings",
  "calendarEvents",
  "scheduleItems",
  "goalMilestoneEvents",
  // Always written already-encrypted (see vaultEntryRepository.ts) via the
  // gate in Vault.tsx, so this normally migrates zero rows -- included for
  // the same reason every other table is: consistency, and covering the
  // edge case of a pre-existing row from before that gate existed.
  "vaultEntries",
  "workoutExercises",
  "workoutEntries",
  "netWorthItems",
  "netWorthSnapshots",
  "subscriptions",
  "budgetPeriodSnapshots",
];

export const CHUNK_SIZE = 200;

const MIGRATION_LOCK_KEY = "encryption:migrationLock";
const MIGRATION_LOCK_STALE_MS = 5 * 60 * 1000;

export class MigrationAlreadyInProgressError extends Error {
  constructor() {
    super("An encryption migration is already in progress");
    this.name = "MigrationAlreadyInProgressError";
  }
}

// Same lock key for both directions — an enable and a disable migration
// must never run concurrently any more than two enables (or two disables)
// should; db.syncState's single row doesn't need to know which direction
// holds it, only that one does.
export async function acquireMigrationLock(): Promise<void> {
  const existing = await db.syncState.get(MIGRATION_LOCK_KEY);

  if (existing) {
    const timestamp = Number(existing.value.split(":")[1]);
    if (Number.isFinite(timestamp) && Date.now() - timestamp < MIGRATION_LOCK_STALE_MS) {
      throw new MigrationAlreadyInProgressError();
    }
  }

  await db.syncState.put({ key: MIGRATION_LOCK_KEY, value: `${crypto.randomUUID()}:${Date.now()}` });
}

export async function releaseMigrationLock(): Promise<void> {
  await db.syncState.delete(MIGRATION_LOCK_KEY);
}
