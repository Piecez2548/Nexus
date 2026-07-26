import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Holding } from "../types";

const encrypted = createEncryptedRepository<Holding>(db.holdings);

export const holdingRepository = {
  getAll: () => encrypted.getAll(),

  add: (holding: Holding) => encrypted.add(withSyncMeta(holding)),

  update: (id: number, holding: Holding) =>
    encrypted.update(id, withSyncMeta({ ...holding, id })),

  remove: async (id: number) => {
    const existing = await db.holdings.get(id);
    await db.holdings.delete(id);
    await recordTombstone("holdings", existing?.syncId);
  },
};
