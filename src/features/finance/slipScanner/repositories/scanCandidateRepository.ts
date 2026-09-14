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

  // Candidates from completed runs are the review queue. Running/paused runs
  // remain owned by the resumable scan flow and must not appear twice.
  async listCompletedRuns(): Promise<SlipCandidate[]> {
    const completedRuns = await db.slipScanRuns.where("status").equals("completed").toArray();
    const completedIds = new Set(completedRuns.flatMap((run) => (run.id === undefined ? [] : [run.id])));
    if (completedIds.size === 0) return [];

    const rows = await db.slipScanCandidates.toArray();
    return rows.filter((row) => completedIds.has(row.runId)).map((row) => row.candidate);
  },

  async clearCandidates(candidateIds: Iterable<string>): Promise<void> {
    const ids = new Set(candidateIds);
    if (ids.size === 0) return;
    await db.slipScanCandidates.filter((row) => ids.has(row.candidate.id)).delete();
  },

  async clearRunExcept(runId: number, candidateIds: Iterable<string>): Promise<void> {
    const keep = new Set(candidateIds);
    await db.slipScanCandidates
      .where("runId")
      .equals(runId)
      .filter((row) => !keep.has(row.candidate.id))
      .delete();
  },

  async clearRun(runId: number): Promise<void> {
    await db.slipScanCandidates.where("runId").equals(runId).delete();
  },
};
