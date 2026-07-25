import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Budget } from "../types";

export const budgetRepository = {
  getAll: () => db.budgets.toArray(),

  add: (budget: Budget) => db.budgets.add(withSyncMeta(budget)),

  update: (id: number, budget: Budget) =>
    db.budgets.put(withSyncMeta({ ...budget, id })),

  remove: async (id: number) => {
    const existing = await db.budgets.get(id);
    await db.budgets.delete(id);
    await recordTombstone("budgets", existing?.syncId);
  },
};
