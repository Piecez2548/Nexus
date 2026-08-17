// Append-only audit trail for security-relevant events across the whole app
// (originally scoped to the gallery scanner alone — GS-017/GS-038 — widened
// here to also cover auth, encryption, app-lock, vault, and backup/restore).
// Deliberately records only non-sensitive metadata (counts, statuses, ids,
// booleans), never secret/financial content, so the log itself is safe to
// keep and inspect. Kept as a bounded in-memory ring buffer with an
// injectable sink so callers don't need to know or care how (or whether)
// it's persisted — see dexieAuditSink.ts for the real persisted sink.

export type AuditEventType =
  | "permission"
  | "import"
  | "scan"
  | "delete"
  | "validation"
  | "suspicious"
  | "auth"
  | "encryption"
  | "lock"
  | "vault"
  | "backup";

export interface AuditEvent {
  type: AuditEventType;
  action: string;
  at: number;
  detail?: Record<string, string | number | boolean>;
}

export interface AuditSink {
  record: (event: AuditEvent) => void | Promise<void>;
}

// Shape of a persisted row (see auditLogRepository.ts / dexieAuditSink.ts) --
// just an AuditEvent plus Dexie's own auto-increment primary key.
export interface AuditLogRow extends AuditEvent {
  id?: number;
}

const MAX_EVENTS = 200;

let buffer: AuditEvent[] = [];
let sink: AuditSink | null = null;
let clock: () => number = () => Date.now();

// Inject a persistence sink (and optionally a clock, for tests). The sink is
// best-effort — a throwing sink never breaks the caller.
export function configureAuditLog(options: { sink?: AuditSink | null; clock?: () => number }): void {
  if ("sink" in options) sink = options.sink ?? null;
  if (options.clock) clock = options.clock;
}

export function recordAudit(
  type: AuditEventType,
  action: string,
  detail?: Record<string, string | number | boolean>,
): AuditEvent {
  const event: AuditEvent = { type, action, at: clock(), ...(detail ? { detail } : {}) };

  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer = buffer.slice(buffer.length - MAX_EVENTS);

  if (sink) {
    try {
      void sink.record(event);
    } catch {
      // A failing sink must never break the caller.
    }
  }

  return event;
}

export function recordPermissionAudit(action: string, detail?: Record<string, string | number | boolean>): AuditEvent {
  return recordAudit("permission", action, detail);
}

export function recordImportAudit(action: string, detail?: Record<string, string | number | boolean>): AuditEvent {
  return recordAudit("import", action, detail);
}

export function getAuditLog(): readonly AuditEvent[] {
  return buffer;
}

export function clearAuditLog(): void {
  buffer = [];
}
