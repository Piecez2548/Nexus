import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Transaction } from "../types";

export const transactionRepository = {
  getAll: () => db.transactions.toArray(),

  add: (transaction: Transaction) => db.transactions.add(withSyncMeta(transaction)),

  update: (id: number, transaction: Transaction) =>
    db.transactions.put(withSyncMeta({ ...transaction, id })),

  remove: async (id: number) => {
    const existing = await db.transactions.get(id);
    await db.transactions.delete(id);
    await recordTombstone("transactions", existing?.syncId);
  },
};
