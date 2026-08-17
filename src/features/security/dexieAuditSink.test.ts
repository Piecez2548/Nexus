import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { dexieAuditSink } from "./dexieAuditSink";
import { auditLogRepository } from "./auditLogRepository";

describe("dexieAuditSink", () => {
  beforeEach(async () => {
    await db.auditLog.clear();
  });

  it("persists a recorded event", async () => {
    await dexieAuditSink.record({ type: "encryption", action: "enabled", at: 1000 });

    const entries = await auditLogRepository.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: "encryption", action: "enabled", at: 1000 });
  });

  it("trims the oldest events once the persisted count exceeds the cap", async () => {
    for (let i = 0; i < 505; i++) {
      await dexieAuditSink.record({ type: "lock", action: "unlock-attempt", at: i });
    }

    const entries = await auditLogRepository.list();
    expect(entries).toHaveLength(500);
    // Newest-first list: the most recent event (at=504) survives, the
    // oldest 5 (at=0..4) were trimmed.
    expect(entries[0].at).toBe(504);
    expect(entries.some((e) => e.at < 5)).toBe(false);
  });
});
