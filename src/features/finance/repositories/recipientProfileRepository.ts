import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import type { RecipientProfile } from "../types";

export const recipientProfileRepository = {
  getAll: () => db.recipientProfiles.toArray(),

  getByKey: (recipientKey: string) =>
    db.recipientProfiles.where("recipientKey").equals(recipientKey).first(),

  add: (profile: RecipientProfile) => db.recipientProfiles.add(withSyncMeta(profile)),

  update: (id: number, profile: RecipientProfile) =>
    db.recipientProfiles.put(withSyncMeta({ ...profile, id })),

  remove: async (id: number) => {
    const existing = await db.recipientProfiles.get(id);
    await db.recipientProfiles.delete(id);
    await recordTombstone("recipientProfiles", existing?.syncId);
  },
};
