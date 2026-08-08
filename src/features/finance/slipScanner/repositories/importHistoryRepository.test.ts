import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";

import { importHistoryRepository } from "./importHistoryRepository";

const entry = (importedAt: string): ImportHistoryEntry => ({
  importedAt,
  source: "gallery",
  bank: "scb",
  amount: 100,
  importedCount: 2,
  failedCount: 0,
  status: "success",
  durationMs: 1000,
});

beforeEach(async () => {
  await db.slipImportHistory.clear();
});

describe("importHistoryRepository", () => {
  it("adds entries and lists them newest-first", async () => {
    await importHistoryRepository.add(entry("2026-08-01T10:00:00.000Z"));
    await importHistoryRepository.add(entry("2026-08-03T10:00:00.000Z"));
    await importHistoryRepository.add(entry("2026-08-02T10:00:00.000Z"));

    const list = await importHistoryRepository.list();
    expect(list.map((e) => e.importedAt)).toEqual([
      "2026-08-03T10:00:00.000Z",
      "2026-08-02T10:00:00.000Z",
      "2026-08-01T10:00:00.000Z",
    ]);
  });

  it("clears history", async () => {
    await importHistoryRepository.add(entry("2026-08-01T10:00:00.000Z"));
    await importHistoryRepository.clear();
    expect(await importHistoryRepository.list()).toEqual([]);
  });
});
