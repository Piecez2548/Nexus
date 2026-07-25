import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { TransactionTemplate } from "../types";

export const transactionTemplateRepository = {
  getAll: () => db.transactionTemplates.toArray(),

  add: (template: TransactionTemplate) => db.transactionTemplates.add(withSyncMeta(template)),

  update: (id: number, template: TransactionTemplate) =>
    db.transactionTemplates.put(withSyncMeta({ ...template, id })),

  remove: async (id: number) => {
    const existing = await db.transactionTemplates.get(id);
    await db.transactionTemplates.delete(id);
    await recordTombstone("transactionTemplates", existing?.syncId);
  },
};
