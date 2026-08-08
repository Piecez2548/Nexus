import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAuditLog, recordPermissionAudit } from "@/features/finance/slipScanner/security/scanAuditLog";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { buildValidationReport, exportScannerLogs, runInDev } from "./scannerDevTools";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  amount: 100,
  merchant: "Shop",
  date: "2024-05-12",
  ...over,
});

const today = () => "2026-01-01";

beforeEach(() => clearAuditLog());
afterEach(() => clearAuditLog());

describe("runInDev", () => {
  it("runs the function only in dev mode", () => {
    const fn = vi.fn(() => 42);
    expect(runInDev(fn, true)).toBe(42);
    expect(runInDev(fn, false)).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("exportScannerLogs", () => {
  it("serialises the audit trail plus extra profiling data", () => {
    recordPermissionAudit("granted");
    const json = JSON.parse(exportScannerLogs({ perf: { qrPerSec: 5 } }));
    expect(json.audit).toHaveLength(1);
    expect(json.audit[0].action).toBe("granted");
    expect(json.perf.qrPerSec).toBe(5);
    expect(typeof json.exportedAt).toBe("string");
  });
});

describe("buildValidationReport", () => {
  it("aggregates valid/invalid counts and issue codes", () => {
    const report = buildValidationReport(
      [candidate({ id: "1" }), candidate({ id: "2", amount: undefined }), candidate({ id: "3", confidence: 10 })],
      { today },
    );
    expect(report.total).toBe(3);
    expect(report.valid).toBe(2); // #1 and #3 (low confidence is a warning, still valid)
    expect(report.invalid).toBe(1); // #2 missing amount → error
    expect(report.issueCounts["amount-missing"]).toBe(1);
    expect(report.issueCounts["low-confidence"]).toBe(1);
  });
});
