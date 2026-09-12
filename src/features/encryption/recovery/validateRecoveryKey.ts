import { db } from "@/database/db";
import type { EncryptedRow } from "@/database/encryptedRepository";
import { decryptField } from "@/features/encryption/crypto/encryption";
import { CHUNK_SIZE, ENCRYPTABLE_TABLES } from "@/features/encryption/migration/migrationShared";

export class RecoveryKeyMismatchError extends Error {
  constructor() {
    super("The recovered key cannot decrypt existing local data");
    this.name = "RecoveryKeyMismatchError";
  }
}

// Recovery must not replace the local PIN wrap with another account's key
// (or a stale escrow key). Check every existing envelope before any lock
// state changes. Empty/new devices have no local ciphertext to validate.
export async function validateRecoveryKey(dek: CryptoKey): Promise<void> {
  for (const tableName of ENCRYPTABLE_TABLES) {
    const table = db.table<EncryptedRow, number>(tableName);
    let afterId: number | undefined;
    while (true) {
      const page = afterId === undefined ? table.orderBy(":id") : table.where(":id").above(afterId);
      const rows = await page.limit(CHUNK_SIZE).toArray();
      if (rows.length === 0) break;
      for (const row of rows) {
        if (row.encryptedContent !== undefined) {
          try {
            await decryptField(dek, row.encryptedContent);
          } catch {
            throw new RecoveryKeyMismatchError();
          }
        }
      }
      afterId = rows[rows.length - 1].id!;
    }
  }
}
