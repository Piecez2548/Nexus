import {
  getAuditLog,
  recordAudit,
  type AuditEvent,
  type AuditEventType,
} from "@/features/security/auditLog";

// The security-relevant slice of the audit trail (GS-038), adding recorders
// for deletions, failed validations, and suspicious activity on top of the
// base log's permission/import recorders. Like the base log it stores only
// non-sensitive metadata, so the trail is safe to keep.

export function recordDeletionAudit(action: string, detail?: Record<string, string | number | boolean>): AuditEvent {
  return recordAudit("delete", action, detail);
}

export function recordValidationFailureAudit(
  action: string,
  detail?: Record<string, string | number | boolean>,
): AuditEvent {
  return recordAudit("validation", action, detail);
}

export function recordSuspiciousAudit(
  reason: string,
  detail?: Record<string, string | number | boolean>,
): AuditEvent {
  return recordAudit("suspicious", reason, detail);
}

export type SecurityEventType = Exclude<AuditEventType, "scan">;

const SECURITY_TYPES: SecurityEventType[] = [
  "permission",
  "import",
  "delete",
  "validation",
  "suspicious",
  "auth",
  "encryption",
  "lock",
  "vault",
  "backup",
];

// The security-relevant events only (excludes routine "scan" progress events).
export function getSecurityEvents(): AuditEvent[] {
  return getAuditLog().filter((event) => event.type !== "scan");
}

export type SecurityAuditSummary = Record<SecurityEventType, number>;

export function summarizeSecurityAudit(): SecurityAuditSummary {
  const summary = Object.fromEntries(SECURITY_TYPES.map((type) => [type, 0])) as SecurityAuditSummary;
  for (const event of getSecurityEvents()) summary[event.type as SecurityEventType] += 1;
  return summary;
}
