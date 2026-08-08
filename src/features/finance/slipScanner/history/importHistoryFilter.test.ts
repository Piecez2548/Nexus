import { describe, expect, it } from "vitest";

import { deriveImportStatus, type ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";

import { filterImportHistory } from "./importHistoryFilter";

const entry = (over: Partial<ImportHistoryEntry>): ImportHistoryEntry => ({
  importedAt: "2026-08-01T10:00:00.000Z",
  source: "gallery",
  bank: "scb",
  amount: 120,
  importedCount: 3,
  failedCount: 0,
  status: "success",
  durationMs: 5000,
  ...over,
});

const entries: ImportHistoryEntry[] = [
  entry({ importedAt: "2026-08-01T10:00:00.000Z", bank: "scb", status: "success", amount: 120 }),
  entry({ importedAt: "2026-08-02T10:00:00.000Z", bank: "kbank", status: "partial", amount: 550, failedCount: 1, errors: ["bad-amount"] }),
  entry({ importedAt: "2026-08-03T10:00:00.000Z", bank: "scb", status: "failed", amount: 89, importedCount: 0, failedCount: 2 }),
];

describe("deriveImportStatus", () => {
  it("maps counts to status", () => {
    expect(deriveImportStatus(3, 0)).toBe("success");
    expect(deriveImportStatus(3, 1)).toBe("partial");
    expect(deriveImportStatus(0, 2)).toBe("failed");
  });
});

describe("filterImportHistory", () => {
  it("filters by status and bank", () => {
    expect(filterImportHistory(entries, { status: "success" }).map((e) => e.bank)).toEqual(["scb"]);
    expect(filterImportHistory(entries, { bank: "scb" })).toHaveLength(2);
  });

  it("filters by date range", () => {
    const r = filterImportHistory(entries, { from: "2026-08-02T00:00:00.000Z", to: "2026-08-02T23:59:59.000Z" });
    expect(r).toHaveLength(1);
    expect(r[0]!.bank).toBe("kbank");
  });

  it("searches across bank, status, amount and errors", () => {
    expect(filterImportHistory(entries, { search: "bad-amount" })).toHaveLength(1);
    expect(filterImportHistory(entries, { search: "120" }).map((e) => e.amount)).toEqual([120]);
    expect(filterImportHistory(entries, { search: "" })).toHaveLength(3);
  });
});
