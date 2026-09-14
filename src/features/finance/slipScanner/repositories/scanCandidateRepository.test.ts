import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { scanCandidateRepository } from "./scanCandidateRepository";

const candidate = (id: string): SlipCandidate => ({
  id,
  assetId: id,
  source: "ocr",
  amount: 120,
  merchant: `Merchant ${id}`,
  isDuplicate: false,
  confidence: 70,
});

beforeEach(async () => {
  await db.slipScanCandidates.clear();
  await db.slipScanRuns.clear();
});

describe("scanCandidateRepository review queue", () => {
  it("lists candidates from completed runs while excluding resumable runs", async () => {
    const completedRun = await db.slipScanRuns.add({
      status: "completed",
      source: "native-media",
      startedAt: "2026-09-15T00:00:00.000Z",
      total: 1,
      done: 1,
      skipped: 0,
      failed: 0,
    });
    const resumableRun = await db.slipScanRuns.add({
      status: "paused",
      source: "native-media",
      startedAt: "2026-09-15T00:01:00.000Z",
      total: 1,
      done: 0,
      skipped: 0,
      failed: 0,
    });
    await scanCandidateRepository.add(completedRun, candidate("completed"));
    await scanCandidateRepository.add(resumableRun, candidate("paused"));

    expect((await scanCandidateRepository.listCompletedRuns()).map((item) => item.id)).toEqual(["completed"]);
  });

  it("removes resolved candidates across their original scan runs", async () => {
    const firstRun = await db.slipScanRuns.add({
      status: "completed",
      source: "native-media",
      startedAt: "2026-09-15T00:00:00.000Z",
      total: 2,
      done: 2,
      skipped: 0,
      failed: 0,
    });
    const secondRun = await db.slipScanRuns.add({
      status: "completed",
      source: "native-media",
      startedAt: "2026-09-15T00:01:00.000Z",
      total: 1,
      done: 1,
      skipped: 0,
      failed: 0,
    });
    await scanCandidateRepository.add(firstRun, candidate("keep"));
    await scanCandidateRepository.add(firstRun, candidate("remove"));
    await scanCandidateRepository.add(secondRun, candidate("remove-too"));

    await scanCandidateRepository.clearCandidates(["remove", "remove-too"]);

    expect((await scanCandidateRepository.listCompletedRuns()).map((item) => item.id)).toEqual(["keep"]);
  });

  it("clears a run while preserving its unresolved review candidates", async () => {
    const runId = await db.slipScanRuns.add({
      status: "completed",
      source: "native-media",
      startedAt: "2026-09-15T00:00:00.000Z",
      total: 2,
      done: 2,
      skipped: 0,
      failed: 0,
    });
    await scanCandidateRepository.add(runId, candidate("keep"));
    await scanCandidateRepository.add(runId, candidate("remove"));

    await scanCandidateRepository.clearRunExcept(runId, ["keep"]);

    expect((await scanCandidateRepository.listByRun(runId)).map((item) => item.id)).toEqual(["keep"]);
  });
});
