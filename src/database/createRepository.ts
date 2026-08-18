import type { Table } from "dexie";

import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import { PLAINTEXT_KEYS } from "@/database/plaintextKeys";
import type { SyncMeta } from "@/utils/syncMeta";
import type { SyncTableName } from "@/features/sync/types";

// Factory for the standard getAll/add/update/remove repository shape that
// was hand-duplicated (byte-identical apart from the entity/table name)
// across ~12 feature repositories. Covers every repository with exactly
// this 4-method shape; the two with a genuinely different shape
// (merchantRepository.ts — read-only, no add/update/remove;
// goalMilestoneEventRepository.ts — no update, has an extra getForGoal)
// are left as their own hand-written files rather than forced into this.
export function createRepository<T extends SyncMeta & { id?: number }>(
  table: Table<T, number>,
  tableName: SyncTableName
) {
  // Derived from tableName rather than accepted as a per-call-site option —
  // PLAINTEXT_KEYS is the single source of truth (see plaintextKeys.ts), so
  // there's structurally nowhere left for a call site to specify a value
  // that could drift from it.
  const plaintextKeys = (PLAINTEXT_KEYS[tableName] ?? []) as (keyof T)[];
  const encrypted = createEncryptedRepository<T>(table, { plaintextKeys });

  return {
    getAll: () => encrypted.getAll(),

    add: (entity: T) => encrypted.add(withSyncMeta(entity)),

    update: (id: number, entity: T) => encrypted.update(id, withSyncMeta({ ...entity, id })),

    remove: async (id: number) => {
      const existing = await table.get(id);
      await table.delete(id);
      await recordTombstone(tableName, existing?.syncId);
    },

    // Exposed for the rare repository (recipientProfileRepository) that
    // needs a direct `.where()` lookup decrypted the same way getAll would.
    decryptOptional: (row: T | undefined) => encrypted.decryptOptional(row),
  };
}
