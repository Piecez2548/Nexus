import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAuditLog,
  configureAuditLog,
  getAuditLog,
  recordImportAudit,
  recordPermissionAudit,
  type AuditEvent,
} from "./auditLog";

beforeEach(() => {
  clearAuditLog();
  configureAuditLog({ sink: null, clock: () => 1000 });
});

afterEach(() => {
  clearAuditLog();
  configureAuditLog({ sink: null });
});

describe("auditLog", () => {
  it("records permission and import events with a timestamp and detail", () => {
    recordPermissionAudit("granted", { status: "granted" });
    recordImportAudit("completed", { imported: 3, failed: 1 });

    const log = getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ type: "permission", action: "granted", at: 1000, detail: { status: "granted" } });
    expect(log[1]).toMatchObject({ type: "import", action: "completed", detail: { imported: 3, failed: 1 } });
  });

  it("forwards events to an injected sink without breaking on a throwing sink", () => {
    const record = vi.fn(() => {
      throw new Error("sink down");
    });
    configureAuditLog({ sink: { record } });

    expect(() => recordImportAudit("completed")).not.toThrow();
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("caps the in-memory buffer at 200 events", () => {
    for (let i = 0; i < 250; i++) recordPermissionAudit("check", { i });
    const log = getAuditLog();
    expect(log).toHaveLength(200);
    // The oldest were dropped; the newest is retained.
    expect((log[log.length - 1] as AuditEvent).detail).toEqual({ i: 249 });
  });
});
