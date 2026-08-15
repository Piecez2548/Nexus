import { useState } from "react";

import { defaultSmartImportDeps } from "@/features/finance/slipScanner/import/smartImportDeps";
import {
  rollbackImport,
  runSmartImport,
  type SmartImportDeps,
  type SmartImportOptions,
  type SmartImportProgress,
  type SmartImportResult,
} from "@/features/finance/slipScanner/import/smartImport";
import { deriveImportStatus, type ImportSource } from "@/features/finance/slipScanner/models/importHistory";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { importHistoryRepository } from "@/features/finance/slipScanner/repositories/importHistoryRepository";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

// Record one Import History entry (GS-035) per batch: dominant bank + total
// amount among what actually imported, a failed/skipped count (real failures
// and near-certain duplicates of an existing transaction alike — both mean
// "didn't end up as a new row"), and every error/skip reason. Best-effort —
// this is a local log, never a reason to fail a real import.
async function recordImportHistory(
  candidates: SlipCandidate[],
  result: SmartImportResult,
  durationMs: number,
  source: ImportSource,
): Promise<void> {
  const importedSet = new Set(result.importedCandidateIds);
  const bankCounts = new Map<string, number>();
  let amount = 0;
  for (const candidate of candidates) {
    if (!importedSet.has(candidate.id)) continue;
    amount += candidate.amount ?? 0;
    if (candidate.bankName) bankCounts.set(candidate.bankName, (bankCounts.get(candidate.bankName) ?? 0) + 1);
  }
  let bank: string | undefined;
  let bankMax = 0;
  for (const [name, count] of bankCounts) {
    if (count > bankMax) {
      bank = name;
      bankMax = count;
    }
  }

  const notCreated = result.failed.length + result.skippedDuplicates.length;
  const errors = [...result.failed.map((f) => f.error), ...result.skippedDuplicates.map((d) => d.error)];

  try {
    await importHistoryRepository.add({
      importedAt: new Date().toISOString(),
      source,
      bank,
      amount: amount > 0 ? amount : undefined,
      importedCount: result.importedIds.length,
      failedCount: notCreated,
      status: deriveImportStatus(result.importedIds.length, notCreated),
      durationMs,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    // Best-effort local log — never let it break the import itself.
  }
}

export interface UseSmartImport {
  running: boolean;
  progress: SmartImportProgress | null;
  result: SmartImportResult | null;
  importCandidates: (candidates: SlipCandidate[], options?: SmartImportOptions, historySource?: ImportSource) => Promise<SmartImportResult>;
  undo: () => Promise<number>;
}

// React entry point for Smart Import: runs the batch, tracks progress/result,
// refreshes the transaction list once after the batch (rather than re-listing
// per row), and exposes an undo that rolls the last import back. Persistence is
// injectable for tests; production uses the transactionService-backed deps.
export function useSmartImport(deps: SmartImportDeps = defaultSmartImportDeps): UseSmartImport {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SmartImportProgress | null>(null);
  const [result, setResult] = useState<SmartImportResult | null>(null);
  const loadTransactions = useTransactionStore((state) => state.loadTransactions);

  async function importCandidates(
    candidates: SlipCandidate[],
    options: SmartImportOptions = {},
    historySource: ImportSource = "gallery",
  ): Promise<SmartImportResult> {
    setRunning(true);
    setResult(null);
    setProgress(null);
    const startedAt = Date.now();
    try {
      const res = await runSmartImport(candidates, deps, { ...options, onProgress: setProgress });
      setResult(res);
      await loadTransactions();
      if (candidates.length > 0) await recordImportHistory(candidates, res, Date.now() - startedAt, historySource);
      return res;
    } finally {
      setRunning(false);
    }
  }

  async function undo(): Promise<number> {
    if (!result) return 0;
    const removed = await rollbackImport(result.importedIds, deps);
    await loadTransactions();
    setResult(null);
    return removed;
  }

  return { running, progress, result, importCandidates, undo };
}
