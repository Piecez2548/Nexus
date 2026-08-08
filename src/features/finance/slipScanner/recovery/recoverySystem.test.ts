import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { SlipScanRun } from "@/features/finance/slipScanner/models/scanTypes";

import { detectRecovery, planRecovery } from "./recoverySystem";

const run = (over: Partial<SlipScanRun> = {}): SlipScanRun => ({
  status: "running",
  source: "gallery",
  startedAt: "2026-08-01T10:00:00.000Z",
  total: 100,
  done: 40,
  skipped: 0,
  failed: 0,
  ...over,
});

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipImportHistory.clear();
});

describe("planRecovery", () => {
  it("plans a scan resume and an import retry", () => {
    const actions = planRecovery({ resumableScan: run({ id: 7, status: "paused" }), lastImportFailed: true });
    expect(actions).toEqual([
      { kind: "resume-scan", runId: 7, detail: "paused" },
      { kind: "retry-import" },
    ]);
  });

  it("returns a single 'none' action when nothing is pending", () => {
    expect(planRecovery({ resumableScan: null, lastImportFailed: false })).toEqual([{ kind: "none" }]);
  });
});

describe("detectRecovery", () => {
  it("detects a left-over running scan and a failed last import", async () => {
    await db.slipScanRuns.add(run({ status: "running" }));
    await db.slipImportHistory.add({
      importedAt: "2026-08-01T10:00:00.000Z",
      source: "gallery",
      importedCount: 0,
      failedCount: 3,
      status: "failed",
      durationMs: 1000,
    });

    const state = await detectRecovery();
    expect(state.resumableScan?.status).toBe("running");
    expect(state.lastImportFailed).toBe(true);
    expect(planRecovery(state).map((a) => a.kind)).toEqual(["resume-scan", "retry-import"]);
  });

  it("reports nothing to recover on a clean state", async () => {
    const state = await detectRecovery();
    expect(state).toEqual({ resumableScan: null, lastImportFailed: false });
  });
});
