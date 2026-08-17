import { db } from "@/database/db";
import type { ScanStatus, SlipScanRun } from "@/features/finance/slipScanner/models/scanTypes";

// Thin repository over the local (unsynced) slipScanRuns table. Not built on
// createRepository — that factory is for synced entities (it stamps syncMeta
// and writes tombstones); scan sessions are device-local operational state,
// so we access Dexie directly, exactly like the sync engine does for its own
// syncState/syncTombstones tables.
export const scanRunRepository = {
  create(run: SlipScanRun): Promise<number> {
    return db.slipScanRuns.add(run);
  },

  get(id: number): Promise<SlipScanRun | undefined> {
    return db.slipScanRuns.get(id);
  },

  // The one run to resume on launch, if any — a session left running/paused
  // by a killed app. Excludes date-range-bounded runs: a paused/interrupted
  // date-range scan must never be resumed as if it were a normal, unbounded
  // scan (see SlipScanRun.dateRange's own comment).
  async getResumable(): Promise<SlipScanRun | undefined> {
    const candidates = await db.slipScanRuns.where("status").anyOf("running", "paused").toArray();
    return candidates.filter((r) => !r.dateRange).at(-1);
  },

  checkpoint(id: number, patch: Partial<SlipScanRun>): Promise<number> {
    return db.slipScanRuns.update(id, patch);
  },

  finish(id: number, status: ScanStatus, finishedAt: string): Promise<number> {
    return db.slipScanRuns.update(id, { status, finishedAt });
  },
};
