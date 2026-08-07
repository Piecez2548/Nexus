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
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

export interface UseSmartImport {
  running: boolean;
  progress: SmartImportProgress | null;
  result: SmartImportResult | null;
  importCandidates: (candidates: SlipCandidate[], options?: SmartImportOptions) => Promise<SmartImportResult>;
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
  ): Promise<SmartImportResult> {
    setRunning(true);
    setResult(null);
    setProgress(null);
    try {
      const res = await runSmartImport(candidates, deps, { ...options, onProgress: setProgress });
      setResult(res);
      await loadTransactions();
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
