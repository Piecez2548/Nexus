// Append-only audit trail for security-relevant scanner events — the
// "permission audit" and "import audit" requirements. Deliberately records only
// non-sensitive metadata (counts, statuses, asset ids), never slip financial
// content, so the log itself is safe to keep and inspect. Kept as a bounded
// in-memory ring buffer with an injectable sink so a later task can persist it
// without changing call sites.

export type ScanAuditType = "permission" | "import" | "scan" | "delete";

export interface ScanAuditEvent {
  type: ScanAuditType;
  action: string;
  at: number;
  detail?: Record<string, string | number | boolean>;
}

export interface ScanAuditSink {
  record: (event: ScanAuditEvent) => void | Promise<void>;
}

const MAX_EVENTS = 200;

let buffer: ScanAuditEvent[] = [];
let sink: ScanAuditSink | null = null;
let clock: () => number = () => Date.now();

// Inject a persistence sink (and optionally a clock, for tests). The sink is
// best-effort — a throwing sink never breaks the scanner.
export function configureScanAudit(options: { sink?: ScanAuditSink | null; clock?: () => number }): void {
  if ("sink" in options) sink = options.sink ?? null;
  if (options.clock) clock = options.clock;
}

export function recordAudit(
  type: ScanAuditType,
  action: string,
  detail?: Record<string, string | number | boolean>,
): ScanAuditEvent {
  const event: ScanAuditEvent = { type, action, at: clock(), ...(detail ? { detail } : {}) };

  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer = buffer.slice(buffer.length - MAX_EVENTS);

  if (sink) {
    try {
      void sink.record(event);
    } catch {
      // A failing sink must never break scanning.
    }
  }

  return event;
}

export function recordPermissionAudit(action: string, detail?: Record<string, string | number | boolean>): ScanAuditEvent {
  return recordAudit("permission", action, detail);
}

export function recordImportAudit(action: string, detail?: Record<string, string | number | boolean>): ScanAuditEvent {
  return recordAudit("import", action, detail);
}

export function getAuditLog(): readonly ScanAuditEvent[] {
  return buffer;
}

export function clearAuditLog(): void {
  buffer = [];
}
