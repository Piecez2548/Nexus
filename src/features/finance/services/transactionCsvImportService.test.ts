import { describe, expect, it, vi } from "vitest";

import { importTransactionsCsv, type ImportTransactionsCsvDeps } from "./transactionCsvImportService";
import type { Transaction } from "@/features/finance/types";

function row(over: Partial<Transaction> = {}): Transaction {
  return {
    title: "Coffee Shop",
    amount: 250,
    type: "expense",
    account: "Cash",
    date: "2026-08-08",
    time: "09:15",
    note: "KBank · REF999",
    status: "completed",
    ...over,
  };
}

function fakeDeps(existing: Transaction[] = []): ImportTransactionsCsvDeps & { added: Transaction[] } {
  const added: Transaction[] = [];
  return {
    added,
    listTransactions: async () => existing,
    addTransaction: async (t) => {
      added.push(t);
    },
  };
}

describe("importTransactionsCsv", () => {
  it("imports every row when there is nothing to conflict with", async () => {
    const deps = fakeDeps([]);
    const result = await importTransactionsCsv([row(), row({ title: "Rent", amount: 8000, note: undefined })], deps);

    expect(result).toEqual({ importedCount: 2, skippedDuplicateCount: 0 });
    expect(deps.added).toHaveLength(2);
  });

  // Regression: CSV import previously had no duplicate detection at all --
  // re-importing the same file (or a file with an accidental repeat row)
  // silently doubled every transaction.
  it("skips a row that is a near-certain duplicate of an existing transaction (matching reference + amount + merchant + time)", async () => {
    const deps = fakeDeps([row()]);
    const result = await importTransactionsCsv([row()], deps);

    expect(result).toEqual({ importedCount: 0, skippedDuplicateCount: 1 });
    expect(deps.added).toHaveLength(0);
  });

  it("keeps a row when the match against an existing transaction is only a weak signal", async () => {
    const deps = fakeDeps([row({ date: "2026-01-01", time: undefined, note: undefined })]);
    const result = await importTransactionsCsv([row()], deps);

    expect(result).toEqual({ importedCount: 1, skippedDuplicateCount: 0 });
    expect(deps.added).toHaveLength(1);
  });

  it("skips a same-batch duplicate row against one already imported earlier in this same CSV", async () => {
    const deps = fakeDeps([]);
    const result = await importTransactionsCsv([row(), row()], deps);

    expect(result).toEqual({ importedCount: 1, skippedDuplicateCount: 1 });
    expect(deps.added).toHaveLength(1);
  });

  it("does not call addTransaction for a skipped duplicate", async () => {
    const addTransaction = vi.fn(async () => {});
    const deps: ImportTransactionsCsvDeps = { listTransactions: async () => [row()], addTransaction };

    await importTransactionsCsv([row()], deps);

    expect(addTransaction).not.toHaveBeenCalled();
  });
});
