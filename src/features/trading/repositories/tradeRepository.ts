import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Trade } from "../types";

export const tradeRepository = {
  getAll: () => db.trades.toArray(),

  add: (trade: Trade) => db.trades.add(withSyncMeta(trade)),

  update: (id: number, trade: Trade) =>
    db.trades.put(withSyncMeta({ ...trade, id })),

  remove: async (id: number) => {
    const existing = await db.trades.get(id);
    await db.trades.delete(id);
    await recordTombstone("trades", existing?.syncId);
  },
};
