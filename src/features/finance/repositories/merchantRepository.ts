import { db } from "@/database/db";

export const merchantRepository = {
  getAll: () => db.merchants.toArray(),
};
