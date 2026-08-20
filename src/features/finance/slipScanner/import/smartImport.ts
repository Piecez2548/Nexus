import { resolveConflict } from "@/features/finance/slipScanner/import/conflictResolver";
import { candidateToTransaction, type CandidateImportOptions } from "@/features/finance/slipScanner/import/candidateToTransaction";
import { findBestDuplicate, type DuplicateSignals } from "@/features/finance/slipScanner/engine/dedup/smartDuplicate";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";
import { toErrorMessage } from "@/utils/asyncState";

// Persistence seam so the import is testable without Dexie and decoupled from
// the store. createTransaction returns the new row id (needed for rollback).
export interface SmartImportDeps {
  createTransaction: (transaction: Transaction) => Promise<number>;
  deleteTransaction: (id: number) => Promise<void>;
  // Existing transactions to check each candidate against for a likely
  // duplicate (the Import Conflict Resolver, GS-032) before creating a new
  // row. Optional — when omitted, no cross-existing-transaction check runs
  // (matches the prior behavior exactly; within-batch duplicates are still
  // caught upstream by the scan's own duplicate detection).
  listTransactions?: () => Promise<Transaction[]>;
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
  // Candidates intentionally skipped as a near-certain duplicate of an
  // existing transaction (Import Conflict Resolver default policy — only
  // ever populated when deps.listTransactions is provided). Kept separate
  // from `failed`: these were not errors, they were correctly not imported.
  skippedDuplicates: SmartImportFailure[];
}

function candidateSignals(candidate: SlipCandidate): DuplicateSignals {
  return {
    payload: candidate.payload,
    reference: candidate.reference,
    amount: candidate.amount,
    merchant: candidate.merchant?.trim() || candidate.bankName?.trim(),
    timestamp: [candidate.date, candidate.time].filter(Boolean).join(" ") || undefined,
  };
}

// candidateToTransaction always builds `note` as [bankName, reference] joined
// by " · ", bank first — so a two-part note's second half is the reference.
// A single-part note is ambiguous (could be just the bank, or a plain manual
// note) and is deliberately not treated as a reference.
function referenceFromNote(note: string | undefined): string | undefined {
  if (!note) return undefined;
  const sepIndex = note.indexOf(" · ");
  if (sepIndex < 0) return undefined;
  return note.slice(sepIndex + 3).trim() || undefined;
}

function transactionSignals(transaction: Transaction): DuplicateSignals {
  return {
    reference: referenceFromNote(transaction.note),
    amount: transaction.amount,
    merchant: transaction.title,
    timestamp: [transaction.date, transaction.time].filter(Boolean).join(" ") || undefined,
  };
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
  const skippedDuplicates: SmartImportFailure[] = [];
  const total = candidates.length;
  let done = 0;

  // Fetched once per batch, not per candidate — existing transactions rarely
  // change mid-import and this keeps the conflict check to one query. Only
  // when the caller opts in at all (listTransactions provided) — omitting
  // it means no conflict checking of any kind, an explicit, tested contract
  // (see "does not check for conflicts at all when listTransactions is not
  // provided" below) that must stay true even after this same batch starts
  // importing successfully.
  const conflictCheckEnabled = deps.listTransactions !== undefined;
  const existing = (await deps.listTransactions?.()) ?? [];
  const existingSignals = existing.map(transactionSignals);

  const emit = (): void => onProgress?.({ done, total, imported: importedIds.length, failed: failed.length });

  for (const candidate of candidates) {
    if (isCancelled?.()) {
      return { status: "cancelled", importedIds, importedCandidateIds, failed, skippedDuplicates };
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

    if (existingSignals.length > 0) {
      const best = findBestDuplicate(candidateSignals(candidate), existingSignals);
      if (best) {
        const decision = resolveConflict({
          candidate,
          existingId: existing[best.index]?.id ?? null,
          duplicateProbability: best.score.probability,
        });
        if (decision.resolution === "skip") {
          skippedDuplicates.push({ candidateId: candidate.id, error: "duplicate-of-existing" });
          done += 1;
          emit();
          continue;
        }
        // Only "skip" and "keep-both" are ever reached here (resolveConflict's
        // default policy, no override passed); "replace"/"merge" only happen
        // when a caller explicitly overrides per candidate, which none does
        // yet (see conflictResolver.ts) — "keep-both" falls through to a
        // normal import below, same as no conflict at all.
      }
    }

    try {
      const transaction = map(candidate);
      const id = await deps.createTransaction(transaction);
      importedIds.push(id);
      importedCandidateIds.push(candidate.id);
      // Same-batch duplicate guard: without this, two candidates in one
      // batch describing the same real-world slip (e.g. a photo and a
      // screenshot of it) only ever get checked against the pre-existing
      // snapshot fetched above, never against each other. Gated behind
      // conflictCheckEnabled so a caller that omits listTransactions keeps
      // its documented "no conflict checking at all" contract intact.
      if (conflictCheckEnabled) {
        existing.push({ ...transaction, id });
        existingSignals.push(transactionSignals(transaction));
      }
    } catch (err) {
      failed.push({ candidateId: candidate.id, error: toErrorMessage(err) });
    }

    done += 1;
    emit();
  }

  return { status: "completed", importedIds, importedCandidateIds, failed, skippedDuplicates };
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
