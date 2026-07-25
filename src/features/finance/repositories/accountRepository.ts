import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { Account } from "../types";

export const accountRepository = {
  getAll: () => db.accounts.toArray(),

  add: (account: Account) => db.accounts.add(withSyncMeta(account)),

  update: (id: number, account: Account) =>
    db.accounts.update(id, withSyncMeta(account)),

  remove: async (id: number) => {
    const existing = await db.accounts.get(id);
    await db.accounts.delete(id);
    await recordTombstone("accounts", existing?.syncId);
  },
};
