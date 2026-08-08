import {
  getAuditLog,
  recordAudit,
  type ScanAuditEvent,
  type ScanAuditType,
} from "@/features/finance/slipScanner/security/scanAuditLog";

// Security Audit (GS-038): the security-relevant slice of the scanner audit
// trail (GS-017), adding recorders for deletions, failed validations, and
// suspicious activity on top of the existing permission/import recorders. Like
// the base log it stores only non-sensitive metadata (statuses, counts, ids),
// so the trail is safe to keep; routing it to encrypted-at-rest storage is a
// matter of wiring the base log's injectable sink.

export function recordDeletionAudit(action: string, detail?: Record<string, string | number | boolean>): ScanAuditEvent {
  return recordAudit("delete", action, detail);
}

export function recordValidationFailureAudit(
  action: string,
  detail?: Record<string, string | number | boolean>,
): ScanAuditEvent {
  return recordAudit("validation", action, detail);
}

export function recordSuspiciousAudit(
  reason: string,
  detail?: Record<string, string | number | boolean>,
): ScanAuditEvent {
  return recordAudit("suspicious", reason, detail);
}

export type SecurityEventType = Exclude<ScanAuditType, "scan">;

const SECURITY_TYPES: SecurityEventType[] = ["permission", "import", "delete", "validation", "suspicious"];

// The security-relevant events only (excludes routine "scan" progress events).
export function getSecurityEvents(): ScanAuditEvent[] {
  return getAuditLog().filter((event) => event.type !== "scan");
}

export type SecurityAuditSummary = Record<SecurityEventType, number>;

export function summarizeSecurityAudit(): SecurityAuditSummary {
  const summary = Object.fromEntries(SECURITY_TYPES.map((type) => [type, 0])) as SecurityAuditSummary;
  for (const event of getSecurityEvents()) summary[event.type as SecurityEventType] += 1;
  return summary;
}
