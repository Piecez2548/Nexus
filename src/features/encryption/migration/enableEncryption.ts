import { db } from "@/database/db";
import { downloadFile } from "@/utils/download";
import { exportBackup } from "@/database/backupService";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import {
  generateDek,
  deriveKek,
  wrapDek,
  generateRandomBytes,
  bytesToBase64,
  PBKDF2_ITERATIONS,
} from "@/features/encryption/crypto/encryption";
import { encryptRow, type EncryptedRow } from "@/database/encryptedRepository";
import type { SyncTableName } from "@/features/sync/types";

// Mirrors src/features/sync/types.ts's SyncTableName union as an explicit
// local list, rather than importing syncEngine.ts's private SYNCED_TABLES
// constant — keeps this migration from requiring any change to the sync
// engine itself (it needs none — see syncEngine.test.ts's opaque-blob
// contract test).
const TABLES_TO_MIGRATE: SyncTableName[] = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
];

// Must stay in sync with each repository's plaintextKeys option (see the
// createEncryptedRepository calls in src/features/finance/repositories/*)
// so a row written by this migration is shaped identically to one written
// by a normal repository add/update.
const PLAINTEXT_KEYS: Partial<Record<SyncTableName, string[]>> = {
  recipientProfiles: ["recipientKey"],
  budgets: ["category"],
};

const CHUNK_SIZE = 200;
const MIGRATION_LOCK_KEY = "encryption:migrationLock";
const MIGRATION_LOCK_STALE_MS = 5 * 60 * 1000;

export type MigrationPhase = "backup" | "escrow" | "encrypting" | "verifying" | "done";

export interface MigrationProgress {
  phase: MigrationPhase;
  tableIndex?: number;
  tableCount?: number;
  currentTable?: SyncTableName;
  rowsDone?: number;
  rowsTotal?: number;
}

export class MigrationAlreadyInProgressError extends Error {
  constructor() {
    super("An encryption migration is already in progress");
    this.name = "MigrationAlreadyInProgressError";
  }
}

async function acquireMigrationLock(): Promise<void> {
  const existing = await db.syncState.get(MIGRATION_LOCK_KEY);

  if (existing) {
    const timestamp = Number(existing.value.split(":")[1]);
    if (Number.isFinite(timestamp) && Date.now() - timestamp < MIGRATION_LOCK_STALE_MS) {
      throw new MigrationAlreadyInProgressError();
    }
  }

  await db.syncState.put({ key: MIGRATION_LOCK_KEY, value: `${crypto.randomUUID()}:${Date.now()}` });
}

async function releaseMigrationLock(): Promise<void> {
  await db.syncState.delete(MIGRATION_LOCK_KEY);
}

function downloadPlaintextBackup(json: string): void {
  downloadFile(
    `nexus-backup-before-encryption-${new Date().toISOString().slice(0, 10)}.json`,
    json,
    "application/json"
  );
}

// Escrows a copy of the DEK server-side (wrapped with a key derived from
// the account password, re-entered here as defense-in-depth rather than
// stored raw) so a forgotten PIN can be recovered by signing back in.
// Throws — and touches nothing local — on any failure, so a failed escrow
// can never leave a device with encrypted data and no recovery path.
async function escrowDek(dek: CryptoKey, accountPassword: string): Promise<void> {
  if (!isSyncConfigured || !supabase) {
    throw new Error(
      "Cloud sync must be configured to enable encryption — otherwise a forgotten PIN could never be recovered."
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    throw new Error("You must be signed in to enable encryption");
  }
  const userId = sessionData.session.user.id;
  const email = sessionData.session.user.email;

  // Nothing else here checks that `accountPassword` is actually correct —
  // deriving a KEK from a wrong/mistyped password would still "succeed"
  // and silently escrow an unrecoverable DEK, with no symptom until a
  // different device tries to recover it later. Verifying it re-authenticates
  // against Supabase up front turns that into a loud, immediate failure
  // instead of a silent one discovered only during a future recovery.
  if (email) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: accountPassword });
    if (verifyError) {
      throw new Error("รหัสผ่านบัญชี Sync ไม่ถูกต้อง — กรุณาลองใหม่อีกครั้ง");
    }
  }

  const escrowSalt = generateRandomBytes(16);
  const escrowKek = await deriveKek(accountPassword, escrowSalt, PBKDF2_ITERATIONS);
  const wrapped = await wrapDek(dek, escrowKek);

  const { error } = await supabase.from("user_encryption_keys").upsert({
    user_id: userId,
    wrapped_dek: wrapped.wrapped,
    dek_iv: wrapped.iv,
    escrow_salt: bytesToBase64(escrowSalt),
    escrow_iterations: PBKDF2_ITERATIONS,
  });

  if (error) throw error;
}

// Re-encrypts every not-yet-migrated row in one table, in small committed
// chunks. Idempotency is a per-row predicate — does this row already carry
// encryptedContent? — not a cursor, so this is safe to blindly re-run from
// scratch after any interruption; already-migrated rows are just skipped.
export async function migrateTable(
  table: SyncTableName,
  dek: CryptoKey,
  onChunk?: (rowsDone: number, rowsTotal: number) => void
): Promise<void> {
  const dexieTable = db.table(table);
  const plaintextKeys = PLAINTEXT_KEYS[table] ?? [];

  const allRows: EncryptedRow[] = await dexieTable.toArray();
  const pending = allRows.filter((row) => row.encryptedContent === undefined);

  let done = 0;
  onChunk?.(done, pending.length);

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);

    const encryptedChunk = await Promise.all(
      chunk.map((row) => {
        // Bumping updatedAt is required, not cosmetic — it's the only
        // reason the (otherwise unmodified) sync engine will push this
        // row's new ciphertext up to Supabase on the next sync pass,
        // replacing whatever plaintext copy is sitting there today.
        const bumped = { ...row, updatedAt: new Date().toISOString() };
        return encryptRow(dek, bumped, plaintextKeys as never[]);
      })
    );

    await dexieTable.bulkPut(encryptedChunk as never[]);
    done += chunk.length;
    onChunk?.(done, pending.length);
  }
}

async function verifyTableMigrated(table: SyncTableName): Promise<boolean> {
  const rows: EncryptedRow[] = await db.table(table).toArray();
  return rows.every((row) => row.encryptedContent !== undefined);
}

export interface EnableEncryptionParams {
  pin: string;
  // Re-entered here even though the user is already signed in — Supabase
  // never hands the plaintext password back after sign-in, and it's
  // needed once, at this moment, to derive the escrow-wrapping key.
  accountPassword: string;
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * Turns on encryption-at-rest: escrows a new DEK to the user's Supabase
 * account, wraps it locally with a PIN-derived key, then re-encrypts every
 * existing row across all 9 synced tables. Safe to call again after any
 * interruption — see migrateTable's idempotency predicate above.
 */
export async function enableEncryption({ pin, accountPassword, onProgress }: EnableEncryptionParams): Promise<void> {
  if (!useAuthStore.getState().user) {
    throw new Error("You must be signed in to enable encryption");
  }
  if (!useAppLockStore.getState().isEnabled()) {
    throw new Error("Set up a PIN before enabling encryption");
  }

  await acquireMigrationLock();

  try {
    const alreadyAttached = useAppLockStore.getState().encryptionEnabled;

    onProgress?.({ phase: "backup" });
    downloadPlaintextBackup(await exportBackup());

    let dek: CryptoKey;

    if (alreadyAttached) {
      // Resuming after an earlier interruption — a DEK was already
      // generated, escrowed, and wrapped locally. Reuse the resident
      // session key instead of generating (and escrowing) a second one,
      // which would orphan every row already encrypted with the first.
      const resident = useEncryptionSessionStore.getState().dek;
      if (!resident) {
        throw new Error(
          "Encryption was partially enabled on this device but is currently locked — unlock with your PIN first, then try again."
        );
      }
      dek = resident;
    } else {
      onProgress?.({ phase: "escrow" });
      dek = await generateDek();
      await escrowDek(dek, accountPassword);
      await useAppLockStore.getState().attachEncryption(pin, dek);
    }

    onProgress?.({ phase: "encrypting", tableIndex: 0, tableCount: TABLES_TO_MIGRATE.length });
    for (let i = 0; i < TABLES_TO_MIGRATE.length; i++) {
      const table = TABLES_TO_MIGRATE[i];
      await migrateTable(table, dek, (rowsDone, rowsTotal) => {
        onProgress?.({
          phase: "encrypting",
          tableIndex: i,
          tableCount: TABLES_TO_MIGRATE.length,
          currentTable: table,
          rowsDone,
          rowsTotal,
        });
      });
    }

    onProgress?.({ phase: "verifying" });
    for (const table of TABLES_TO_MIGRATE) {
      const ok = await verifyTableMigrated(table);
      if (!ok) {
        throw new Error(`Migration verification failed for table "${table}" — some rows are still unencrypted.`);
      }
    }

    onProgress?.({ phase: "done" });

    // Best-effort — propagating the new ciphertext promptly is nice to
    // have, but a network hiccup right now shouldn't fail the migration
    // itself (the periodic background sync will pick it up regardless).
    useAuthStore.getState().sync().catch(() => {});
  } finally {
    await releaseMigrationLock();
  }
}
