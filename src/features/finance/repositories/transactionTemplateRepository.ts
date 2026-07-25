import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { TransactionTemplate } from "../types";

const encrypted = createEncryptedRepository<TransactionTemplate>(db.transactionTemplates);

export const transactionTemplateRepository = {
  getAll: () => encrypted.getAll(),

  add: (template: TransactionTemplate) => encrypted.add(withSyncMeta(template)),

  update: (id: number, template: TransactionTemplate) =>
    encrypted.update(id, withSyncMeta({ ...template, id })),

  remove: async (id: number) => {
    const existing = await db.transactionTemplates.get(id);
    await db.transactionTemplates.delete(id);
    await recordTombstone("transactionTemplates", existing?.syncId);
  },
};
