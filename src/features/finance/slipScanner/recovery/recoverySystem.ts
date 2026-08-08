import { importHistoryRepository } from "@/features/finance/slipScanner/repositories/importHistoryRepository";
import { scanRunRepository } from "@/features/finance/slipScanner/repositories/scanRunRepository";
import type { SlipScanRun } from "@/features/finance/slipScanner/models/scanTypes";

// Recovery System (GS-037): after an app crash, device reboot, or interrupted
// scan/import, detect what was left unfinished and plan how to resume — the
// execution reuses the pieces already built (createScanSession resumes by
// cursor/assetId dedup, GS-006; Smart Import resumes via skipCandidateIds,
// GS-016). This layer decides *what* to recover.

export type RecoveryKind = "resume-scan" | "retry-import" | "none";

export interface RecoveryAction {
  kind: RecoveryKind;
  runId?: number;
  detail?: string;
}

export interface RecoveryState {
  resumableScan: SlipScanRun | null; // a run left "running"/"paused" by a killed app
  lastImportFailed: boolean; // the most recent import ended partial/failed
}

// Pure: turn observed state into an ordered list of recovery actions.
export function planRecovery(state: RecoveryState): RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  if (state.resumableScan) {
    actions.push({ kind: "resume-scan", runId: state.resumableScan.id, detail: state.resumableScan.status });
  }
  if (state.lastImportFailed) {
    actions.push({ kind: "retry-import" });
  }
  return actions.length > 0 ? actions : [{ kind: "none" }];
}

// Query the local stores for anything to recover (call on app startup).
export async function detectRecovery(): Promise<RecoveryState> {
  const resumableScan = (await scanRunRepository.getResumable()) ?? null;
  const [lastImport] = await importHistoryRepository.list();
  const lastImportFailed = lastImport !== undefined && lastImport.status !== "success";
  return { resumableScan, lastImportFailed };
}
