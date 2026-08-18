import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { RecipientProfile } from "../types";

const base = createRepository<RecipientProfile>(db.recipientProfiles, "recipientProfiles");

export const recipientProfileRepository = {
  ...base,

  getByKey: async (recipientKey: string) => {
    const row = await db.recipientProfiles.where("recipientKey").equals(recipientKey).first();
    return base.decryptOptional(row);
  },
};
