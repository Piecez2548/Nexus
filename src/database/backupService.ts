import { db } from "./db";
import { seedDatabase } from "./seed";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { decryptField } from "@/features/encryption/crypto/encryption";
import { encryptRow, EncryptionLockedError, type EncryptedRow } from "@/database/encryptedRepository";
import { PLAINTEXT_KEYS } from "@/database/plaintextKeys";
import { ENCRYPTABLE_TABLES } from "@/features/encryption/migration/migrationShared";
import { recordTombstone } from "@/features/sync/tombstones";
import { recordAudit } from "@/features/security/auditLog";
import type { SyncMeta } from "@/utils/syncMeta";
import type { SyncTableName } from "@/features/sync/types";
import type { TranslateFn } from "@/i18n/useTranslation";

// ENCRYPTABLE_TABLES is exactly the set of tables the sync engine tracks
// (see its own doc comment) -- reused here rather than a 4th hand-copy of
// the same list, matching the single-source-of-truth fix already applied
// to PLAINTEXT_KEYS.
const SYNCED_TABLE_LIST = ENCRYPTABLE_TABLES;

// Tombstones every currently-stored row of `table` so its deletion
// propagates to sync -- both resetAllData() and importBackup() replace a
// table's entire contents with a bare .clear(), which never told
// recordTombstone() about any of it, so the "deleted" data silently
// survived on the server and every other signed-in device. `keep` is the
// set of syncIds that are about to be re-added by the same operation (a
// replace, not a genuine delete) and must NOT be tombstoned -- passing none
// (resetAllData's case, nothing survives) tombstones every row.
async function tombstoneTableContents(table: SyncTableName, keep: Set<string> = new Set()): Promise<void> {
  const rows = (await db.table(table).toArray()) as { syncId?: string }[];
  for (const row of rows) {
    if (row.syncId && !keep.has(row.syncId)) {
      await recordTombstone(table, row.syncId);
    }
  }
}

// Reseeded/re-imported rows that predate the sync feature (or, for
// resetAllData, seedDatabase()'s own raw bulkAdd -- see seed.ts) have no
// syncId at all and rely on the sync engine's one-time backfillSyncMeta()
// scan to get stamped. That scan is gated behind a permanent per-table
// "complete" flag (syncEngine.ts, commit 20175c3) which is never otherwise
// cleared -- on a device that already synced before, the flag from before
// this operation would silently skip re-scanning the now-fresh table
// forever, so this data would never reach any other device. Cheap to clear
// unconditionally: each table is now empty or holds only what this
// operation just wrote.
async function clearBackfillFlags(): Promise<void> {
  for (const table of SYNCED_TABLE_LIST) {
    await db.syncState.delete(`backfill:${table}:complete`);
  }
}

const BACKUP_VERSION = 1;

interface NexusBackup {
  version: number;
  exportedAt: string;
  data: {
    transactions: unknown[];
    accounts: unknown[];
    categories: unknown[];
    trades: unknown[];
    recipientProfiles: unknown[];
    merchants: unknown[];
    budgets: unknown[];
    goals: unknown[];
    // Added after the original backup format shipped — optional so backup
    // files exported before these tables existed still import cleanly.
    transactionTemplates?: unknown[];
    todos?: unknown[];
    habits?: unknown[];
    holdings?: unknown[];
    calendarEvents?: unknown[];
    scheduleItems?: unknown[];
    goalMilestoneEvents?: unknown[];
    vaultEntries?: unknown[];
    workoutExercises?: unknown[];
    workoutEntries?: unknown[];
    netWorthItems?: unknown[];
    netWorthSnapshots?: unknown[];
    subscriptions?: unknown[];
    budgetPeriodSnapshots?: unknown[];
  };
}

// A backup is always a portable, human-readable, plaintext disaster-recovery
// artifact — independent of whether encryption-at-rest is enabled on this
// install. Returns null when encryption is off (nothing to decrypt/encrypt).
function residentDekOrNull(): CryptoKey | null {
  if (!useAppLockStore.getState().encryptionEnabled) return null;

  const dek = useEncryptionSessionStore.getState().dek;
  if (dek === null) throw new EncryptionLockedError();
  return dek;
}

async function decryptForExport(dek: CryptoKey | null, rows: unknown[]): Promise<unknown[]> {
  if (dek === null) return rows;

  return Promise.all(
    rows.map(async (row) => {
      const encRow = row as EncryptedRow;
      if (encRow.encryptedContent === undefined) return row;

      const { encryptedContent, ...plaintextAndPlumbing } = encRow;
      const content = await decryptField<Record<string, unknown>>(dek, encryptedContent);
      return { ...plaintextAndPlumbing, ...content };
    })
  );
}

async function encryptForImport(dek: CryptoKey | null, table: SyncTableName, rows: unknown[]): Promise<unknown[]> {
  if (dek === null) return rows;

  const plaintextKeys = PLAINTEXT_KEYS[table] ?? [];
  return Promise.all(rows.map((row) => encryptRow(dek, row as SyncMeta & { id?: number }, plaintextKeys as never[])));
}

export async function exportBackup(): Promise<string> {
  const dek = residentDekOrNull();

  const [
    transactions,
    accounts,
    categories,
    trades,
    recipientProfiles,
    merchants,
    budgets,
    goals,
    transactionTemplates,
    todos,
    habits,
    holdings,
    calendarEvents,
    scheduleItems,
    goalMilestoneEvents,
    vaultEntries,
    workoutExercises,
    workoutEntries,
    netWorthItems,
    netWorthSnapshots,
    subscriptions,
    budgetPeriodSnapshots,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.trades.toArray(),
    db.recipientProfiles.toArray(),
    db.merchants.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.transactionTemplates.toArray(),
    db.todos.toArray(),
    db.habits.toArray(),
    db.holdings.toArray(),
    db.calendarEvents.toArray(),
    db.scheduleItems.toArray(),
    db.goalMilestoneEvents.toArray(),
    db.vaultEntries.toArray(),
    db.workoutExercises.toArray(),
    db.workoutEntries.toArray(),
    db.netWorthItems.toArray(),
    db.netWorthSnapshots.toArray(),
    db.subscriptions.toArray(),
    db.budgetPeriodSnapshots.toArray(),
  ]);

  const backup: NexusBackup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions: await decryptForExport(dek, transactions),
      accounts: await decryptForExport(dek, accounts),
      categories: await decryptForExport(dek, categories),
      trades: await decryptForExport(dek, trades),
      recipientProfiles: await decryptForExport(dek, recipientProfiles),
      merchants,
      budgets: await decryptForExport(dek, budgets),
      goals: await decryptForExport(dek, goals),
      transactionTemplates: await decryptForExport(dek, transactionTemplates),
      todos: await decryptForExport(dek, todos),
      habits: await decryptForExport(dek, habits),
      holdings: await decryptForExport(dek, holdings),
      calendarEvents: await decryptForExport(dek, calendarEvents),
      scheduleItems: await decryptForExport(dek, scheduleItems),
      goalMilestoneEvents: await decryptForExport(dek, goalMilestoneEvents),
      // Vault entries are always encrypted at write time (see
      // vaultEntryRepository.ts) whenever they exist at all, so
      // decryptForExport requires a resident DEK here the same as any other
      // encrypted table -- there's no plaintext-Vault state to fall back to.
      vaultEntries: await decryptForExport(dek, vaultEntries),
      workoutExercises: await decryptForExport(dek, workoutExercises),
      workoutEntries: await decryptForExport(dek, workoutEntries),
      netWorthItems: await decryptForExport(dek, netWorthItems),
      netWorthSnapshots: await decryptForExport(dek, netWorthSnapshots),
      subscriptions: await decryptForExport(dek, subscriptions),
      budgetPeriodSnapshots: await decryptForExport(dek, budgetPeriodSnapshots),
    },
  };

  recordAudit("backup", "exported");
  return JSON.stringify(backup, null, 2);
}

function isNexusBackup(value: unknown): value is NexusBackup {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.version !== "number") return false;
  if (typeof candidate.data !== "object" || candidate.data === null) return false;

  const data = candidate.data as Record<string, unknown>;
  const requiredKeys = [
    "transactions",
    "accounts",
    "categories",
    "trades",
    "recipientProfiles",
    "merchants",
    "budgets",
    "goals",
  ];
  if (!requiredKeys.every((key) => Array.isArray(data[key]))) return false;

  // Optional — missing entirely (older backup files) just means no rows.
  const optionalKeys = [
    "transactionTemplates",
    "todos",
    "habits",
    "holdings",
    "calendarEvents",
    "scheduleItems",
    "goalMilestoneEvents",
    "vaultEntries",
    "workoutExercises",
    "workoutEntries",
    "netWorthItems",
    "netWorthSnapshots",
    "subscriptions",
    "budgetPeriodSnapshots",
  ];
  return optionalKeys.every((key) => data[key] === undefined || Array.isArray(data[key]));
}

export async function importBackup(jsonText: string, translate: TranslateFn): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(translate("settings.backupInvalidJson"));
  }

  if (!isNexusBackup(parsed)) {
    throw new Error(translate("settings.backupInvalidStructure"));
  }

  const { data } = parsed;
  const dek = residentDekOrNull();

  const [
    transactions,
    accounts,
    categories,
    trades,
    recipientProfiles,
    budgets,
    goals,
    transactionTemplates,
    todos,
    habits,
    holdings,
    calendarEvents,
    scheduleItems,
    goalMilestoneEvents,
    vaultEntries,
    workoutExercises,
    workoutEntries,
    netWorthItems,
    netWorthSnapshots,
    subscriptions,
    budgetPeriodSnapshots,
  ] = await Promise.all([
    encryptForImport(dek, "transactions", data.transactions),
    encryptForImport(dek, "accounts", data.accounts),
    encryptForImport(dek, "categories", data.categories),
    encryptForImport(dek, "trades", data.trades),
    encryptForImport(dek, "recipientProfiles", data.recipientProfiles),
    encryptForImport(dek, "budgets", data.budgets),
    encryptForImport(dek, "goals", data.goals),
    encryptForImport(dek, "transactionTemplates", data.transactionTemplates ?? []),
    encryptForImport(dek, "todos", data.todos ?? []),
    encryptForImport(dek, "habits", data.habits ?? []),
    encryptForImport(dek, "holdings", data.holdings ?? []),
    encryptForImport(dek, "calendarEvents", data.calendarEvents ?? []),
    encryptForImport(dek, "scheduleItems", data.scheduleItems ?? []),
    encryptForImport(dek, "goalMilestoneEvents", data.goalMilestoneEvents ?? []),
    encryptForImport(dek, "vaultEntries", data.vaultEntries ?? []),
    encryptForImport(dek, "workoutExercises", data.workoutExercises ?? []),
    encryptForImport(dek, "workoutEntries", data.workoutEntries ?? []),
    encryptForImport(dek, "netWorthItems", data.netWorthItems ?? []),
    encryptForImport(dek, "netWorthSnapshots", data.netWorthSnapshots ?? []),
    encryptForImport(dek, "subscriptions", data.subscriptions ?? []),
    encryptForImport(dek, "budgetPeriodSnapshots", data.budgetPeriodSnapshots ?? []),
  ]);

  // The plaintext syncIds the backup is about to re-add per table, keyed by
  // the same SyncTableName used everywhere else -- a row currently stored
  // whose syncId is in here is being replaced, not deleted, and must not be
  // tombstoned (see tombstoneTableContents' own doc comment).
  const incomingByTable: Partial<Record<SyncTableName, unknown[]>> = {
    transactions: data.transactions,
    accounts: data.accounts,
    categories: data.categories,
    trades: data.trades,
    recipientProfiles: data.recipientProfiles,
    budgets: data.budgets,
    goals: data.goals,
    transactionTemplates: data.transactionTemplates ?? [],
    todos: data.todos ?? [],
    habits: data.habits ?? [],
    holdings: data.holdings ?? [],
    calendarEvents: data.calendarEvents ?? [],
    scheduleItems: data.scheduleItems ?? [],
    goalMilestoneEvents: data.goalMilestoneEvents ?? [],
    vaultEntries: data.vaultEntries ?? [],
    workoutExercises: data.workoutExercises ?? [],
    workoutEntries: data.workoutEntries ?? [],
    netWorthItems: data.netWorthItems ?? [],
    netWorthSnapshots: data.netWorthSnapshots ?? [],
    subscriptions: data.subscriptions ?? [],
    budgetPeriodSnapshots: data.budgetPeriodSnapshots ?? [],
  };

  await db.transaction(
    "rw",
    [
      db.transactions,
      db.accounts,
      db.categories,
      db.trades,
      db.recipientProfiles,
      db.merchants,
      db.budgets,
      db.goals,
      db.transactionTemplates,
      db.todos,
      db.habits,
      db.holdings,
      db.calendarEvents,
      db.scheduleItems,
      db.goalMilestoneEvents,
      db.vaultEntries,
      db.workoutExercises,
      db.workoutEntries,
      db.netWorthItems,
      db.netWorthSnapshots,
      db.subscriptions,
      db.budgetPeriodSnapshots,
      db.syncTombstones,
      db.syncState,
    ],
    async () => {
      // Import replaces every synced table's entire contents -- anything
      // stored locally now that the incoming backup doesn't also carry
      // (by syncId) is being genuinely removed, not just superseded, and
      // must be tombstoned so that removal actually reaches sync instead
      // of silently surviving on the server and every other device.
      for (const table of SYNCED_TABLE_LIST) {
        const incoming = incomingByTable[table] ?? [];
        const keep = new Set(
          incoming
            .map((row) => (row as { syncId?: string } | undefined)?.syncId)
            .filter((id): id is string => Boolean(id))
        );
        await tombstoneTableContents(table, keep);
      }

      await Promise.all([
        db.transactions.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.trades.clear(),
        db.recipientProfiles.clear(),
        db.merchants.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.transactionTemplates.clear(),
        db.todos.clear(),
        db.habits.clear(),
        db.holdings.clear(),
        db.calendarEvents.clear(),
        db.scheduleItems.clear(),
        db.goalMilestoneEvents.clear(),
        db.vaultEntries.clear(),
        db.workoutExercises.clear(),
        db.workoutEntries.clear(),
        db.netWorthItems.clear(),
        db.netWorthSnapshots.clear(),
        db.subscriptions.clear(),
        db.budgetPeriodSnapshots.clear(),
      ]);

      await Promise.all([
        db.transactions.bulkAdd(transactions as never[]),
        db.accounts.bulkAdd(accounts as never[]),
        db.categories.bulkAdd(categories as never[]),
        db.trades.bulkAdd(trades as never[]),
        db.recipientProfiles.bulkAdd(recipientProfiles as never[]),
        db.merchants.bulkAdd(data.merchants as never[]),
        db.budgets.bulkAdd(budgets as never[]),
        db.goals.bulkAdd(goals as never[]),
        db.transactionTemplates.bulkAdd(transactionTemplates as never[]),
        db.todos.bulkAdd(todos as never[]),
        db.habits.bulkAdd(habits as never[]),
        db.holdings.bulkAdd(holdings as never[]),
        db.calendarEvents.bulkAdd(calendarEvents as never[]),
        db.scheduleItems.bulkAdd(scheduleItems as never[]),
        db.goalMilestoneEvents.bulkAdd(goalMilestoneEvents as never[]),
        db.vaultEntries.bulkAdd(vaultEntries as never[]),
        db.workoutExercises.bulkAdd(workoutExercises as never[]),
        db.workoutEntries.bulkAdd(workoutEntries as never[]),
        db.netWorthItems.bulkAdd(netWorthItems as never[]),
        db.netWorthSnapshots.bulkAdd(netWorthSnapshots as never[]),
        db.subscriptions.bulkAdd(subscriptions as never[]),
        db.budgetPeriodSnapshots.bulkAdd(budgetPeriodSnapshots as never[]),
      ]);

      // Same reasoning as resetAllData() -- a very old backup's rows may
      // predate the sync feature (no syncId at all) and need the sync
      // engine's one-time backfill scan to pick them up; a table's flag
      // from before this import must not silently skip that.
      await clearBackfillFlags();
    }
  );

  recordAudit("backup", "imported");
}

export async function resetAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.transactions,
      db.accounts,
      db.categories,
      db.trades,
      db.recipientProfiles,
      db.merchants,
      db.budgets,
      db.goals,
      db.transactionTemplates,
      db.todos,
      db.habits,
      db.holdings,
      db.calendarEvents,
      db.scheduleItems,
      db.goalMilestoneEvents,
      db.vaultEntries,
      db.workoutExercises,
      db.workoutEntries,
      db.netWorthItems,
      db.netWorthSnapshots,
      db.subscriptions,
      db.budgetPeriodSnapshots,
      db.syncTombstones,
      db.syncState,
    ],
    async () => {
      // "Reset All Data" promises a permanent, irreversible deletion (see
      // its own confirm-dialog copy) -- a bare .clear() never told sync
      // about any of it, so the data silently survived on the server and
      // every other signed-in device, contradicting that promise outright.
      // Nothing survives a reset, so every row with a syncId is tombstoned
      // unconditionally.
      for (const table of SYNCED_TABLE_LIST) {
        await tombstoneTableContents(table);
      }

      await Promise.all([
        db.transactions.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.trades.clear(),
        db.recipientProfiles.clear(),
        db.merchants.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.transactionTemplates.clear(),
        db.todos.clear(),
        db.habits.clear(),
        db.holdings.clear(),
        db.calendarEvents.clear(),
        db.scheduleItems.clear(),
        db.goalMilestoneEvents.clear(),
        db.vaultEntries.clear(),
        db.workoutExercises.clear(),
        db.workoutEntries.clear(),
        db.netWorthItems.clear(),
        db.netWorthSnapshots.clear(),
        db.subscriptions.clear(),
        db.budgetPeriodSnapshots.clear(),
      ]);

      // The default accounts/categories seedDatabase() is about to write
      // (see below, outside this transaction) go in via a raw bulkAdd that
      // bypasses withSyncMeta() (seed.ts) -- without clearing these flags,
      // a device that already synced before this reset would never
      // re-scan and stamp them, so they'd silently never reach any other
      // device (this was a real regression from the backfill-flag
      // optimization in commit 20175c3, not just a hypothetical).
      await clearBackfillFlags();
    }
  );

  await seedDatabase();
  recordAudit("backup", "reset");
}
