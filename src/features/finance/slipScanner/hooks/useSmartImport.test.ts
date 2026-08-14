import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { SmartImportDeps } from "@/features/finance/slipScanner/import/smartImport";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { useSmartImport } from "./useSmartImport";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  amount: 100,
  ...over,
});

function fakeDeps() {
  const deleted: number[] = [];
  let nextId = 1;
  const deps: SmartImportDeps = {
    createTransaction: async () => nextId++,
    deleteTransaction: async (id) => {
      deleted.push(id);
    },
  };
  return { deps, deleted };
}

beforeEach(async () => {
  await db.slipImportHistory.clear();
});

describe("useSmartImport", () => {
  it("records an Import History entry for a real batch (GS-035, previously never called in production)", async () => {
    const { deps } = fakeDeps();
    const { result } = renderHook(() => useSmartImport(deps));

    await act(async () => {
      await result.current.importCandidates([
        candidate({ id: "1", amount: 100, bankName: "KBank" }),
        candidate({ id: "2", amount: 50, bankName: "KBank" }),
      ]);
    });

    const history = await db.slipImportHistory.toArray();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      source: "gallery",
      bank: "KBank",
      amount: 150,
      importedCount: 2,
      failedCount: 0,
      status: "success",
    });
  });

  it("does not record history for an empty batch", async () => {
    const { deps } = fakeDeps();
    const { result } = renderHook(() => useSmartImport(deps));

    await act(async () => {
      await result.current.importCandidates([]);
    });

    expect(await db.slipImportHistory.count()).toBe(0);
  });

  it("imports candidates and exposes the result", async () => {
    const { deps } = fakeDeps();
    const { result } = renderHook(() => useSmartImport(deps));

    await act(async () => {
      await result.current.importCandidates([candidate({ id: "1" }), candidate({ id: "2" })]);
    });

    await waitFor(() => expect(result.current.running).toBe(false));
    expect(result.current.result?.importedIds).toEqual([1, 2]);
  });

  it("undo rolls back the imported transactions and clears the result", async () => {
    const { deps, deleted } = fakeDeps();
    const { result } = renderHook(() => useSmartImport(deps));

    await act(async () => {
      await result.current.importCandidates([candidate({ id: "1" })]);
    });
    await act(async () => {
      await result.current.undo();
    });

    expect(deleted).toEqual([1]);
    expect(result.current.result).toBeNull();
  });
});
