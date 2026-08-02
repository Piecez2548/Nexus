import { db } from "./db";
import { seedDatabase } from "./seed";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { decryptField } from "@/features/encryption/crypto/encryption";
import { encryptRow, EncryptionLockedError, type EncryptedRow } from "@/database/encryptedRepository";
import type { SyncMeta } from "@/utils/syncMeta";
import type { TranslateFn } from "@/i18n/useTranslation";

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
  };
}

// Mirrors the plaintextKeys each createEncryptedRepository call uses (see
// encryptedRepository.ts) — must stay in lockstep so a re-imported row is
// encrypted into the exact same shape a live repository write would produce.
const PLAINTEXT_KEYS: Record<string, string[]> = {
  recipientProfiles: ["recipientKey"],
  budgets: ["category"],
};

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

async function encryptForImport(dek: CryptoKey | null, table: string, rows: unknown[]): Promise<unknown[]> {
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
    },
  };

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
  ]);

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
    ],
    async () => {
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
      ]);
    }
  );
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
    ],
    async () => {
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
      ]);
    }
  );

  await seedDatabase();
}
