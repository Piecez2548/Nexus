import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";

import { useImportHistory } from "./useImportHistory";

const entry = (over: Partial<ImportHistoryEntry> = {}): ImportHistoryEntry => ({
  importedAt: "2026-08-10T10:00:00.000Z",
  source: "gallery",
  importedCount: 2,
  failedCount: 0,
  status: "success",
  durationMs: 500,
  ...over,
});

beforeEach(async () => {
  await db.slipImportHistory.clear();
});

describe("useImportHistory", () => {
  it("loads entries newest-first on mount", async () => {
    await db.slipImportHistory.add(entry({ importedAt: "2026-08-01T10:00:00.000Z" }));
    await db.slipImportHistory.add(entry({ importedAt: "2026-08-05T10:00:00.000Z" }));

    const { result } = renderHook(() => useImportHistory());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.importedAt)).toEqual([
      "2026-08-05T10:00:00.000Z",
      "2026-08-01T10:00:00.000Z",
    ]);
  });

  it("filters visible entries by status", async () => {
    await db.slipImportHistory.add(entry({ status: "success" }));
    await db.slipImportHistory.add(entry({ status: "failed", importedCount: 0, failedCount: 1 }));

    const { result } = renderHook(() => useImportHistory());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    act(() => result.current.setStatusFilter("failed"));
    expect(result.current.visible).toHaveLength(1);
    expect(result.current.visible[0].status).toBe("failed");
  });

  it("clears the log and empties the visible list", async () => {
    await db.slipImportHistory.add(entry());
    const { result } = renderHook(() => useImportHistory());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
    expect(await db.slipImportHistory.count()).toBe(0);
  });
});
