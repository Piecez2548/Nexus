import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Transaction } from "../types";

const encrypted = createEncryptedRepository<Transaction>(db.transactions);

export const transactionRepository = {
  getAll: () => encrypted.getAll(),

  add: (transaction: Transaction) => encrypted.add(withSyncMeta(transaction)),

  update: (id: number, transaction: Transaction) =>
    encrypted.update(id, withSyncMeta({ ...transaction, id })),

  remove: async (id: number) => {
    const existing = await db.transactions.get(id);
    await db.transactions.delete(id);
    await recordTombstone("transactions", existing?.syncId);
  },
};
