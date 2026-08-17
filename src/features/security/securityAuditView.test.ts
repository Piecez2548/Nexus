import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearAuditLog, recordAudit, recordPermissionAudit } from "@/features/security/auditLog";

import {
  getSecurityEvents,
  recordDeletionAudit,
  recordSuspiciousAudit,
  recordValidationFailureAudit,
  summarizeSecurityAudit,
} from "./securityAuditView";

beforeEach(() => clearAuditLog());
afterEach(() => clearAuditLog());

describe("security audit recorders", () => {
  it("records deletion, validation-failure and suspicious events", () => {
    recordDeletionAudit("cache-cleared", { count: 5 });
    recordValidationFailureAudit("crc-mismatch", { assetId: "a1" });
    recordSuspiciousAudit("possible-replay", { assetId: "a2" });

    const types = getSecurityEvents().map((e) => e.type);
    expect(types).toEqual(["delete", "validation", "suspicious"]);
  });

  it("excludes routine scan events from the security slice", () => {
    recordAudit("scan", "progress", { done: 10 });
    recordPermissionAudit("granted");
    expect(getSecurityEvents().map((e) => e.type)).toEqual(["permission"]);
  });

  it("summarises counts by security event type, including the app-wide categories", () => {
    recordPermissionAudit("granted");
    recordDeletionAudit("cache-cleared");
    recordDeletionAudit("thumbnails-revoked");
    recordSuspiciousAudit("possible-replay");
    recordAudit("auth", "sign-in");
    recordAudit("vault", "created");
    recordAudit("vault", "created");

    expect(summarizeSecurityAudit()).toEqual({
      permission: 1,
      import: 0,
      delete: 2,
      validation: 0,
      suspicious: 1,
      auth: 1,
      encryption: 0,
      lock: 0,
      vault: 2,
      backup: 0,
    });
  });
});
