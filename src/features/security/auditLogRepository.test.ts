import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { auditLogRepository } from "./auditLogRepository";

describe("auditLogRepository", () => {
  beforeEach(async () => {
    await db.auditLog.clear();
  });

  it("adds and lists events, newest first", async () => {
    await auditLogRepository.add({ type: "auth", action: "sign-in", at: 1000 });
    await auditLogRepository.add({ type: "vault", action: "created", at: 2000, detail: { entryType: "password" } });

    const entries = await auditLogRepository.list();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ type: "vault", action: "created", at: 2000 });
    expect(entries[1]).toMatchObject({ type: "auth", action: "sign-in", at: 1000 });
  });

  it("clears all events", async () => {
    await auditLogRepository.add({ type: "auth", action: "sign-in", at: 1000 });
    await auditLogRepository.clear();

    expect(await auditLogRepository.list()).toHaveLength(0);
  });
});
