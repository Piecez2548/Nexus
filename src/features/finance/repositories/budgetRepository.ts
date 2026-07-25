import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Budget } from "../types";

// `category` stays plaintext — it backs the `&category` unique Dexie index
// (one budget per category), which would otherwise be unenforceable once
// folded into an opaque encrypted blob.
const encrypted = createEncryptedRepository<Budget>(db.budgets, {
  plaintextKeys: ["category"],
});

export const budgetRepository = {
  getAll: () => encrypted.getAll(),

  add: (budget: Budget) => encrypted.add(withSyncMeta(budget)),

  update: (id: number, budget: Budget) =>
    encrypted.update(id, withSyncMeta({ ...budget, id })),

  remove: async (id: number) => {
    const existing = await db.budgets.get(id);
    await db.budgets.delete(id);
    await recordTombstone("budgets", existing?.syncId);
  },
};
