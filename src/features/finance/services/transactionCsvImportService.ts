import { defaultResolution } from "@/features/finance/slipScanner/import/conflictResolver";
import { findBestDuplicate } from "@/features/finance/slipScanner/engine/dedup/smartDuplicate";
import { transactionSignals } from "@/features/finance/slipScanner/import/smartImport";
import type { Transaction } from "@/features/finance/types";

export interface ImportTransactionsCsvDeps {
  listTransactions: () => Promise<Transaction[]>;
  addTransaction: (transaction: Transaction) => Promise<void>;
}

export interface ImportTransactionsCsvResult {
  importedCount: number;
  skippedDuplicateCount: number;
}

// Imports already-validated CSV rows one at a time, skipping any row that's
// a near-certain duplicate (Import Conflict Resolver's own auto-skip policy,
// >=0.85 -- see conflictResolver.ts) of either an existing transaction or a
// row already imported earlier in this same batch. Before this, CSV import
// had no duplicate detection at all: re-importing the same file, or a file
// with an accidental repeat row, silently doubled every transaction.
// Reuses the exact same signal-matching/policy runSmartImport already uses
// for slip imports (see smartImport.ts) rather than a second, differently-
// tuned definition of "duplicate" for this import path.
export async function importTransactionsCsv(
  rows: Transaction[],
  deps: ImportTransactionsCsvDeps,
): Promise<ImportTransactionsCsvResult> {
  const existing = await deps.listTransactions();
  const existingSignals = existing.map(transactionSignals);

  let importedCount = 0;
  let skippedDuplicateCount = 0;

  for (const row of rows) {
    const signals = transactionSignals(row);
    const best = existingSignals.length > 0 ? findBestDuplicate(signals, existingSignals) : null;

    if (best && defaultResolution(best.score.probability) === "skip") {
      skippedDuplicateCount++;
      continue;
    }

    await deps.addTransaction(row);
    existingSignals.push(signals);
    importedCount++;
  }

  return { importedCount, skippedDuplicateCount };
}
