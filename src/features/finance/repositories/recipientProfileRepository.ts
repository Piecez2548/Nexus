import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { RecipientProfile } from "../types";

// `recipientKey` stays plaintext — it backs the `&recipientKey` unique
// Dexie index and the getByKey lookup below, both of which need to query
// it directly. It's a phone/PromptPay-style identifier, not the sensitive
// content (that's the transaction history tied to it, which is encrypted).
const encrypted = createEncryptedRepository<RecipientProfile>(db.recipientProfiles, {
  plaintextKeys: ["recipientKey"],
});

export const recipientProfileRepository = {
  getAll: () => encrypted.getAll(),

  getByKey: async (recipientKey: string) => {
    const row = await db.recipientProfiles.where("recipientKey").equals(recipientKey).first();
    return encrypted.decryptOptional(row);
  },

  add: (profile: RecipientProfile) => encrypted.add(withSyncMeta(profile)),

  update: (id: number, profile: RecipientProfile) =>
    encrypted.update(id, withSyncMeta({ ...profile, id })),

  remove: async (id: number) => {
    const existing = await db.recipientProfiles.get(id);
    await db.recipientProfiles.delete(id);
    await recordTombstone("recipientProfiles", existing?.syncId);
  },
};
