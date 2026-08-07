import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

describe("useSmartImport", () => {
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
