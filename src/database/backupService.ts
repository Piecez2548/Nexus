import { db } from "./db";
import { seedDatabase } from "./seed";

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
  };
}

export async function exportBackup(): Promise<string> {
  const [
    transactions,
    accounts,
    categories,
    trades,
    recipientProfiles,
    merchants,
    budgets,
    goals,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.trades.toArray(),
    db.recipientProfiles.toArray(),
    db.merchants.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
  ]);

  const backup: NexusBackup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      accounts,
      categories,
      trades,
      recipientProfiles,
      merchants,
      budgets,
      goals,
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

  return requiredKeys.every((key) => Array.isArray(data[key]));
}

export async function importBackup(jsonText: string): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง (ไม่ใช่ JSON)");
  }

  if (!isNexusBackup(parsed)) {
    throw new Error("โครงสร้างไฟล์สำรองข้อมูลไม่ถูกต้อง");
  }

  const { data } = parsed;

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
      ]);

      await Promise.all([
        db.transactions.bulkAdd(data.transactions as never[]),
        db.accounts.bulkAdd(data.accounts as never[]),
        db.categories.bulkAdd(data.categories as never[]),
        db.trades.bulkAdd(data.trades as never[]),
        db.recipientProfiles.bulkAdd(data.recipientProfiles as never[]),
        db.merchants.bulkAdd(data.merchants as never[]),
        db.budgets.bulkAdd(data.budgets as never[]),
        db.goals.bulkAdd(data.goals as never[]),
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
      ]);
    }
  );

  await seedDatabase();
}
