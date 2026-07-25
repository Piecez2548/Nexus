import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Trade } from "../types";

const encrypted = createEncryptedRepository<Trade>(db.trades);

export const tradeRepository = {
  getAll: () => encrypted.getAll(),

  add: (trade: Trade) => encrypted.add(withSyncMeta(trade)),

  update: (id: number, trade: Trade) =>
    encrypted.update(id, withSyncMeta({ ...trade, id })),

  remove: async (id: number) => {
    const existing = await db.trades.get(id);
    await db.trades.delete(id);
    await recordTombstone("trades", existing?.syncId);
  },
};
