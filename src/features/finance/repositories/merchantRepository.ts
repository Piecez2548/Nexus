import { db } from "@/database/db";
import type { Merchant } from "@/features/finance/types";

// Hand-written, not createRepository -- merchants is deliberately not a
// synced/encrypted table (bundled seed/reference data, not personal data;
// see sync/types.ts's own comment), so the generic factory's sync-metadata
// and encryption wrapping don't apply here. `name` carries the table's own
// `&name` unique Dexie index (one merchant per name).
export const merchantRepository = {
  getAll: (): Promise<Merchant[]> => db.merchants.toArray(),

  add: (merchant: Merchant): Promise<number> => db.merchants.add(merchant),

  update: (id: number, merchant: Merchant): Promise<number> => db.merchants.update(id, merchant),

  remove: (id: number): Promise<void> => db.merchants.delete(id),
};
