import { describe, expect, it, vi } from "vitest";

import type { SmartImportDeps } from "./smartImport";
import { rollbackImport, runSmartImport } from "./smartImport";
import { SafeVerificationPersistenceBlocked, withSafeVerificationBoundary } from "./safeSmartImportDeps";

describe("safe verification persistence boundary", () => {
  it("blocks at createTransaction even if Smart Import is called directly", async () => {
    const createTransaction = vi.fn(async () => 7);
    const deps: SmartImportDeps = {
      createTransaction,
      deleteTransaction: vi.fn(),
      listTransactions: vi.fn().mockResolvedValue([]),
    };
    const safeDeps = withSafeVerificationBoundary(deps, true);
    const result = await runSmartImport([{
      id: "candidate-1",
      assetId: "asset-1",
      source: "qr",
      isDuplicate: false,
      confidence: 90,
      amount: 100,
    }], safeDeps);

    expect(createTransaction).not.toHaveBeenCalled();
    expect(result.importedIds).toEqual([]);
    expect(result.failed[0]?.error).toBe(new SafeVerificationPersistenceBlocked().message);
  });

  it("also blocks transaction deletion/rollback while safe mode is active", async () => {
    const deleteTransaction = vi.fn();
    const deps: SmartImportDeps = { createTransaction: vi.fn(), deleteTransaction };
    const safeDeps = withSafeVerificationBoundary(deps, true);

    expect(await rollbackImport([7], safeDeps)).toBe(0);
    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  it("leaves normal transaction persistence unchanged when safe mode is off", async () => {
    const createTransaction = vi.fn(async () => 9);
    const deps: SmartImportDeps = { createTransaction, deleteTransaction: vi.fn() };
    const wrapped = withSafeVerificationBoundary(deps, false);
    expect(wrapped).toBe(deps);
    expect(await wrapped.createTransaction({} as never)).toBe(9);
  });
});
