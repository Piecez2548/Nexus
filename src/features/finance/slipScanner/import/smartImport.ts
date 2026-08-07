import { candidateToTransaction, type CandidateImportOptions } from "@/features/finance/slipScanner/import/candidateToTransaction";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";
import { toErrorMessage } from "@/utils/asyncState";

// Persistence seam so the import is testable without Dexie and decoupled from
// the store. createTransaction returns the new row id (needed for rollback).
export interface SmartImportDeps {
  createTransaction: (transaction: Transaction) => Promise<number>;
  deleteTransaction: (id: number) => Promise<void>;
}

export interface SmartImportProgress {
  done: number;
  total: number;
  imported: number;
  failed: number;
}

export interface SmartImportFailure {
  candidateId: string;
  error: string;
}

export interface SmartImportResult {
  status: "completed" | "cancelled";
  importedIds: number[];
  importedCandidateIds: string[];
  failed: SmartImportFailure[];
}

export interface SmartImportOptions extends CandidateImportOptions {
  onProgress?: (progress: SmartImportProgress) => void;
  // Cooperative cancellation, checked before each item.
  isCancelled?: () => boolean;
  // Resume support: candidate ids already imported in a previous (partial) run
  // are skipped so a re-run continues rather than duplicating.
  skipCandidateIds?: Set<string>;
  // Override the default candidate→transaction mapping.
  mapper?: (candidate: SlipCandidate) => Transaction;
}

// Batch-import selected slip candidates as transactions. Resilient by design
// (error recovery): a single candidate failing — a bad amount, a persistence
// error — is recorded in `failed` and the batch continues, rather than aborting
// everything. Reports progress per item, supports cooperative cancellation, and
// skips already-imported candidates on resume. To undo a run, pass its
// `importedIds` to `rollbackImport`.
export async function runSmartImport(
  candidates: SlipCandidate[],
  deps: SmartImportDeps,
  options: SmartImportOptions = {},
): Promise<SmartImportResult> {
  const { onProgress, isCancelled, skipCandidateIds, mapper, ...mapOptions } = options;
  const map = mapper ?? ((candidate: SlipCandidate) => candidateToTransaction(candidate, mapOptions));

  const importedIds: number[] = [];
  const importedCandidateIds: string[] = [];
  const failed: SmartImportFailure[] = [];
  const total = candidates.length;
  let done = 0;

  const emit = (): void => onProgress?.({ done, total, imported: importedIds.length, failed: failed.length });

  for (const candidate of candidates) {
    if (isCancelled?.()) {
      return { status: "cancelled", importedIds, importedCandidateIds, failed };
    }

    if (skipCandidateIds?.has(candidate.id)) {
      done += 1;
      emit();
      continue;
    }

    if (candidate.amount === undefined || !(candidate.amount > 0)) {
      failed.push({ candidateId: candidate.id, error: "missing-amount" });
      done += 1;
      emit();
      continue;
    }

    try {
      const id = await deps.createTransaction(map(candidate));
      importedIds.push(id);
      importedCandidateIds.push(candidate.id);
    } catch (err) {
      failed.push({ candidateId: candidate.id, error: toErrorMessage(err) });
    }

    done += 1;
    emit();
  }

  return { status: "completed", importedIds, importedCandidateIds, failed };
}

// Undo an import by deleting its created transactions. Best-effort: a delete
// that fails (already gone) doesn't stop the rest. Returns the count removed.
export async function rollbackImport(importedIds: number[], deps: SmartImportDeps): Promise<number> {
  let removed = 0;
  for (const id of importedIds) {
    try {
      await deps.deleteTransaction(id);
      removed += 1;
    } catch {
      // Ignore — the row may already be gone; keep rolling back the rest.
    }
  }
  return removed;
}
