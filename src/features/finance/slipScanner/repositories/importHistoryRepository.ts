import { db } from "@/database/db";
import type { ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";

// Thin repository over the local (unsynced) slipImportHistory table (GS-035).
// Like scanRunRepository, this is device-local operational state, so it uses
// Dexie directly rather than the synced-entity createRepository factory.
export const importHistoryRepository = {
  add(entry: ImportHistoryEntry): Promise<number> {
    return db.slipImportHistory.add(entry);
  },

  // Newest first.
  async list(): Promise<ImportHistoryEntry[]> {
    return (await db.slipImportHistory.orderBy("importedAt").reverse().toArray()) as ImportHistoryEntry[];
  },

  clear(): Promise<void> {
    return db.slipImportHistory.clear();
  },
};
