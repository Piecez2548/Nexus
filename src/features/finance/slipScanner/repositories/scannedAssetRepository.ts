import { db } from "@/database/db";
import type { SlipScannedAsset } from "@/features/finance/slipScanner/models/scanTypes";

// Local (unsynced) record of every scanned image — the backing store for
// incremental scan (skip by assetId) and duplicate prevention (skip by
// contentHash). Direct Dexie access, like scanRunRepository.
export const scannedAssetRepository = {
  async hasAsset(assetId: string): Promise<boolean> {
    return (await db.slipScannedAssets.where("assetId").equals(assetId).count()) > 0;
  },

  async hasContent(contentHash: string): Promise<boolean> {
    return (await db.slipScannedAssets.where("contentHash").equals(contentHash).count()) > 0;
  },

  async record(entry: SlipScannedAsset): Promise<void> {
    // Unique &assetId index makes this idempotent under a race — a duplicate
    // insert throws, which the caller treats as "already scanned".
    await db.slipScannedAssets.put(entry);
  },
};
