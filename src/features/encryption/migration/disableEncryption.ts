import { db } from "@/database/db";
import { downloadFile } from "@/utils/download";
import { exportBackup } from "@/database/backupService";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { hashPin } from "@/features/lock/utils/pinHash";
import { decryptRow, EncryptionLockedError, type EncryptedRow } from "@/database/encryptedRepository";
import {
  ENCRYPTABLE_TABLES,
  CHUNK_SIZE,
  acquireMigrationLock,
  releaseMigrationLock,
} from "@/features/encryption/migration/migrationShared";
import { recordAudit } from "@/features/security/auditLog";
import type { SyncTableName } from "@/features/sync/types";
import type { TranslateFn } from "@/i18n/useTranslation";

export type DisableMigrationPhase = "backup" | "decrypting" | "verifying" | "done";

export interface DisableMigrationProgress {
  phase: DisableMigrationPhase;
  tableIndex?: number;
  tableCount?: number;
  currentTable?: SyncTableName;
  rowsDone?: number;
  rowsTotal?: number;
}

function downloadPlaintextBackup(json: string): void {
  downloadFile(
    `nexus-backup-before-disabling-encryption-${new Date().toISOString().slice(0, 10)}.json`,
    json,
    "application/json"
  );
}

// The exact inverse of enableEncryption.ts's migrateTable: processes rows
// that still carry encryptedContent (rather than ones that don't), decrypts
// them back to a plain row via the shared decryptRow, and bulkPuts them
// without encryptedContent. Same chunking/idempotency shape, so it's safe
// to blindly re-run after any interruption -- already-decrypted rows are
// just skipped on the next pass.
export async function decryptTable(
  table: SyncTableName,
  dek: CryptoKey,
  onChunk?: (rowsDone: number, rowsTotal: number) => void
): Promise<void> {
  const dexieTable = db.table(table);

  const allRows: EncryptedRow[] = await dexieTable.toArray();
  const pending = allRows.filter((row) => row.encryptedContent !== undefined);

  let done = 0;
  onChunk?.(done, pending.length);

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);

    const decryptedChunk = await Promise.all(
      chunk.map(async (row) => {
        const plain = await decryptRow<Record<string, unknown>>(dek, row);
        // Bumping updatedAt is required, not cosmetic -- same reason
        // migrateTable bumps it: it's the only reason the (otherwise
        // unmodified) sync engine will push this row's new plaintext shape
        // up on the next sync pass, replacing whatever ciphertext is there.
        return { ...plain, updatedAt: new Date().toISOString() };
      })
    );

    await dexieTable.bulkPut(decryptedChunk as never[]);
    done += chunk.length;
    onChunk?.(done, pending.length);
  }
}

async function verifyTableDecrypted(table: SyncTableName): Promise<boolean> {
  const rows: EncryptedRow[] = await db.table(table).toArray();
  return rows.every((row) => row.encryptedContent === undefined);
}

export interface DisableEncryptionParams {
  pin: string;
  onProgress?: (progress: DisableMigrationProgress) => void;
  translate: TranslateFn;
}

/**
 * Turns off encryption-at-rest: decrypts every existing row back to
 * plaintext across every encryptable table, verifies none remain encrypted,
 * and only then clears the locally wrapped DEK and flips encryptionEnabled
 * off. That ordering is the whole safety story here (see detachEncryption's
 * own comment and encryptionKeySlice's unwrapDekForUnlock, which only ever
 * attempts to unwrap a DEK while encryptionEnabled is still true) -- it must
 * never be flipped before every row is confirmed plaintext, or an
 * interruption partway through could leave the user permanently unable to
 * read their own remaining ciphertext. Safe to call again after any
 * interruption -- see decryptTable's idempotency predicate above.
 */
export async function disableEncryption({ pin, onProgress, translate }: DisableEncryptionParams): Promise<void> {
  const { encryptionEnabled, pinHash, salt } = useAppLockStore.getState();
  if (!encryptionEnabled) {
    throw new Error(translate("settings.encryptionNotEnabled"));
  }
  if (pinHash === null || salt === null) {
    throw new Error(translate("settings.encryptionPinRequired"));
  }

  const candidate = await hashPin(pin, salt);
  if (candidate !== pinHash) {
    throw new Error(translate("lock.pinIncorrect"));
  }

  const dek = useEncryptionSessionStore.getState().dek;
  if (dek === null) {
    throw new EncryptionLockedError();
  }

  await acquireMigrationLock();

  try {
    onProgress?.({ phase: "backup" });
    downloadPlaintextBackup(await exportBackup());

    onProgress?.({ phase: "decrypting", tableIndex: 0, tableCount: ENCRYPTABLE_TABLES.length });
    for (let i = 0; i < ENCRYPTABLE_TABLES.length; i++) {
      const table = ENCRYPTABLE_TABLES[i];
      await decryptTable(table, dek, (rowsDone, rowsTotal) => {
        onProgress?.({
          phase: "decrypting",
          tableIndex: i,
          tableCount: ENCRYPTABLE_TABLES.length,
          currentTable: table,
          rowsDone,
          rowsTotal,
        });
      });
    }

    onProgress?.({ phase: "verifying" });
    for (const table of ENCRYPTABLE_TABLES) {
      const ok = await verifyTableDecrypted(table);
      if (!ok) {
        throw new Error(translate("settings.encryptionVerificationFailed", { table }));
      }
    }

    // Flag flip LAST -- everything above this line is safely resumable with
    // encryptionEnabled/wrappedDek untouched; nothing below this line can
    // leave any data unreadable.
    useAppLockStore.getState().detachEncryption();

    onProgress?.({ phase: "done" });
    recordAudit("encryption", "disabled", { tableCount: ENCRYPTABLE_TABLES.length });

    // Best-effort, non-blocking: the operation has already fully succeeded
    // by this point, so a network failure here shouldn't surface as an
    // error. A stale escrow row is harmless -- nothing reads it once no
    // device has encryptionEnabled on, and a future enableEncryption() just
    // upserts a fresh one over it. Unlike escrowDek during *enable*, where
    // failure must block (new key material would otherwise be unrecoverable),
    // there's no new key material at risk here.
    try {
      const userId = useAuthStore.getState().user?.id;
      if (isSyncConfigured && supabase && userId) {
        await supabase.from("user_encryption_keys").delete().eq("user_id", userId);
      }
    } catch {
      // best-effort, see above
    }
    useAuthStore.getState().sync().catch(() => {});
  } finally {
    await releaseMigrationLock();
  }
}
