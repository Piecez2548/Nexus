import { db } from "@/database/db";
import type { EncryptedRow } from "@/database/encryptedRepository";
import type { SyncTableName } from "@/features/sync/types";

// Mirrors SyncTableName as an explicit local list (same convention used in
// syncEngine.ts and enableEncryption.ts) rather than importing a shared
// runtime constant.
const SYNCED_TABLES: SyncTableName[] = [
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
];

// True when at least one locally-stored row is already encrypted (e.g.
// synced down from a different device that has enabled encryption) even
// though *this* device's own appLockStore.encryptionEnabled flag may still
// be false — that flag only reflects whether this specific device has ever
// run the enable/recovery flow, not whether the account's data is
// encrypted. Used by AppLockGate to catch this device up (via the same
// account-password recovery flow used for "Forgot PIN") before it ever
// tries to render data it has no way to read.
export async function hasUndecryptableLocalData(): Promise<boolean> {
  for (const table of SYNCED_TABLES) {
    const rows = await db.table(table).toArray();
    if (rows.some((row) => (row as EncryptedRow).encryptedContent !== undefined)) {
      return true;
    }
  }
  return false;
}
