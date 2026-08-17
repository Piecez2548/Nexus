import { db } from "@/database/db";
import type { AuditLogRow } from "@/features/security/auditLog";

// Thin repository over the local (unsynced) auditLog table (SEC-002). Like
// importHistoryRepository, this is device-local operational state, so it
// uses Dexie directly rather than the synced-entity createRepository factory.
export const auditLogRepository = {
  add(entry: AuditLogRow): Promise<number> {
    return db.auditLog.add(entry);
  },

  // Newest first.
  async list(): Promise<AuditLogRow[]> {
    return (await db.auditLog.orderBy("at").reverse().toArray()) as AuditLogRow[];
  },

  clear(): Promise<void> {
    return db.auditLog.clear();
  },
};
