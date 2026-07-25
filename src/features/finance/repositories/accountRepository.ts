import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { Account } from "../types";

const encrypted = createEncryptedRepository<Account>(db.accounts);

export const accountRepository = {
  getAll: () => encrypted.getAll(),

  add: (account: Account) => encrypted.add(withSyncMeta(account)),

  update: (id: number, account: Account) =>
    encrypted.update(id, withSyncMeta({ ...account, id })),

  remove: async (id: number) => {
    const existing = await db.accounts.get(id);
    await db.accounts.delete(id);
    await recordTombstone("accounts", existing?.syncId);
  },
};
