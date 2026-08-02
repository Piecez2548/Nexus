import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { RecipientProfile } from "../types";

// `recipientKey` stays plaintext — it backs the `&recipientKey` unique
// Dexie index and the getByKey lookup below, both of which need to query
// it directly. It's a phone/PromptPay-style identifier, not the sensitive
// content (that's the transaction history tied to it, which is encrypted).
const base = createRepository<RecipientProfile>(db.recipientProfiles, "recipientProfiles", {
  plaintextKeys: ["recipientKey"],
});

export const recipientProfileRepository = {
  ...base,

  getByKey: async (recipientKey: string) => {
    const row = await db.recipientProfiles.where("recipientKey").equals(recipientKey).first();
    return base.decryptOptional(row);
  },
};
