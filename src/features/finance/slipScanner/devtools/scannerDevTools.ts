import { getAuditLog } from "@/features/finance/slipScanner/security/scanAuditLog";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { validateSlipCandidate, type SlipValidationOptions } from "@/features/finance/slipScanner/validation/slipValidation";

// Developer Tools (GS-039): debug/inspection helpers gated to development
// builds. Export logs (audit trail + any extra profiling data), validation
// reports over candidates, and a dev guard so these never run in production.

export function isScannerDevMode(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

// Run a function only in a development build (else no-op). `dev` is injectable
// for tests.
export function runInDev<T>(fn: () => T, dev: boolean = isScannerDevMode()): T | undefined {
  return dev ? fn() : undefined;
}

// Serialise the scanner's audit trail (+ any extra profiling payload, e.g. a
// PerfSnapshot) to a JSON string for "export logs".
export function exportScannerLogs(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), audit: getAuditLog(), ...extra }, null, 2);
}

export interface ValidationReport {
  total: number;
  valid: number;
  invalid: number;
  issueCounts: Record<string, number>;
}

// Aggregate a validation report across candidates (GS-019 rules) — the
// "validation reports" dev tool.
export function buildValidationReport(candidates: SlipCandidate[], options?: SlipValidationOptions): ValidationReport {
  const report: ValidationReport = { total: candidates.length, valid: 0, invalid: 0, issueCounts: {} };
  for (const candidate of candidates) {
    const result = validateSlipCandidate(candidate, options);
    if (result.valid) report.valid += 1;
    else report.invalid += 1;
    for (const issue of result.issues) {
      report.issueCounts[issue.code] = (report.issueCounts[issue.code] ?? 0) + 1;
    }
  }
  return report;
}
