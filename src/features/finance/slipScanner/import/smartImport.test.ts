import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";

import { rollbackImport, runSmartImport, type SmartImportDeps } from "./smartImport";

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
  const created: Array<{ id: number; transaction: Transaction }> = [];
  const deleted: number[] = [];
  let nextId = 1;
  const deps: SmartImportDeps = {
    createTransaction: async (transaction) => {
      const id = nextId++;
      created.push({ id, transaction });
      return id;
    },
    deleteTransaction: async (id) => {
      deleted.push(id);
    },
  };
  return { deps, created, deleted };
}

describe("runSmartImport", () => {
  it("imports a batch and reports progress per item", async () => {
    const { deps, created } = fakeDeps();
    const progress: number[] = [];
    const result = await runSmartImport(
      [candidate({ id: "1" }), candidate({ id: "2" }), candidate({ id: "3" })],
      deps,
      { onProgress: (p) => progress.push(p.done) },
    );

    expect(result.status).toBe("completed");
    expect(result.importedIds).toEqual([1, 2, 3]);
    expect(result.importedCandidateIds).toEqual(["1", "2", "3"]);
    expect(result.failed).toEqual([]);
    expect(created).toHaveLength(3);
    expect(progress).toEqual([1, 2, 3]);
  });

  it("recovers from a bad amount and a persistence error, importing the rest", async () => {
    const { deps } = fakeDeps();
    const throwing: SmartImportDeps = {
      ...deps,
      createTransaction: async (t) => {
        if (t.title === "BOOM") throw new Error("db down");
        return 42;
      },
    };
    const result = await runSmartImport(
      [
        candidate({ id: "1", amount: undefined }),
        candidate({ id: "2", merchant: "BOOM" }),
        candidate({ id: "3", merchant: "OK" }),
      ],
      throwing,
    );

    expect(result.importedCandidateIds).toEqual(["3"]);
    expect(result.failed).toEqual([
      { candidateId: "1", error: "missing-amount" },
      { candidateId: "2", error: "db down" },
    ]);
  });

  it("stops when cancelled and reports what imported so far", async () => {
    const { deps } = fakeDeps();
    let calls = 0;
    const result = await runSmartImport([candidate({ id: "1" }), candidate({ id: "2" })], deps, {
      isCancelled: () => calls++ >= 1, // allow the first, cancel before the second
    });
    expect(result.status).toBe("cancelled");
    expect(result.importedCandidateIds).toEqual(["1"]);
  });

  it("skips already-imported candidates on resume", async () => {
    const { deps, created } = fakeDeps();
    const result = await runSmartImport([candidate({ id: "1" }), candidate({ id: "2" })], deps, {
      skipCandidateIds: new Set(["1"]),
    });
    expect(result.importedCandidateIds).toEqual(["2"]);
    expect(created).toHaveLength(1);
  });
});

describe("rollbackImport", () => {
  it("deletes each imported id and returns the count removed", async () => {
    const { deps, deleted } = fakeDeps();
    const removed = await rollbackImport([1, 2, 3], deps);
    expect(removed).toBe(3);
    expect(deleted).toEqual([1, 2, 3]);
  });
});
