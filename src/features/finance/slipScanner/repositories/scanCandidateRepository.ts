import { db } from "@/database/db";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Thin repository over the local (unsynced) slipScanCandidates table — same
// rationale as scanRunRepository: device-local operational state, not a
// synced entity, so we access Dexie directly rather than going through
// createRepository. Persists each extracted candidate as soon as it's
// produced (BUG-05 fix) so an interrupted scan (app kill, crash, reload)
// doesn't lose work that a resume can never re-extract (see
// ScanCandidateEntry's own comment).
export const scanCandidateRepository = {
  add(runId: number, candidate: SlipCandidate): Promise<number> {
    const { thumbnailUrl: _thumbnailUrl, ...persisted } = candidate;
    return db.slipScanCandidates.add({ runId, assetId: candidate.assetId, candidate: persisted });
  },

  async listByRun(runId: number): Promise<SlipCandidate[]> {
    const rows = await db.slipScanCandidates.where("runId").equals(runId).toArray();
    return rows.map((row) => row.candidate);
  },

  async clearRun(runId: number): Promise<void> {
    await db.slipScanCandidates.where("runId").equals(runId).delete();
  },
};
