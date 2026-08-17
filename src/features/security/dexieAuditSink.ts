import { db } from "@/database/db";
import type { AuditEvent, AuditSink } from "@/features/security/auditLog";

// Real persistence for the audit log's injectable sink (see auditLog.ts's
// configureAuditLog) -- the in-memory ring buffer already existed and worked,
// this just makes it survive a reload. Bounded independently of (and larger
// than) the in-memory cap: persistence changes the retention tradeoff --
// it's cheap to keep more once it's not living in every tab's JS heap.
const MAX_PERSISTED_EVENTS = 500;

export const dexieAuditSink: AuditSink = {
  async record(event: AuditEvent): Promise<void> {
    await db.auditLog.add(event);

    const count = await db.auditLog.count();
    if (count <= MAX_PERSISTED_EVENTS) return;

    const excess = count - MAX_PERSISTED_EVENTS;
    const oldestIds = await db.auditLog.orderBy("at").limit(excess).primaryKeys();
    await db.auditLog.bulkDelete(oldestIds);
  },
};
