import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { recordSnapshot } from "./netWorthTrackingService";
import { useNetWorthSnapshotStore } from "@/features/finance/store/netWorthSnapshotStore";
import { toLocalDateString } from "@/utils/localDate";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { NetWorthItem } from "@/features/finance/types";

function asset(value: number): NetWorthItem {
  return { kind: "asset", name: "Cash", category: "cash", value, icon: "wallet", color: "#16a34a", createdAt: "2026-08-18T00:00:00.000Z" };
}

function liability(value: number): NetWorthItem {
  return { kind: "liability", name: "Loan", category: "loan", value, icon: "banknote", color: "#dc2626", createdAt: "2026-08-18T00:00:00.000Z" };
}

describe("recordSnapshot", () => {
  beforeEach(async () => {
    await db.netWorthSnapshots.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("creates a new snapshot for today with the correct computed totals", async () => {
    await recordSnapshot([asset(1000), liability(400)]);

    const rows = await db.netWorthSnapshots.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: toLocalDateString(new Date()),
      totalAssets: 1000,
      totalLiabilities: 400,
      netWorth: 600,
    });
  });

  it("upserts (does not duplicate) when called again the same day", async () => {
    await recordSnapshot([asset(1000)]);
    await recordSnapshot([asset(1500)]);

    const rows = await db.netWorthSnapshots.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ totalAssets: 1500, netWorth: 1500 });
  });

  it("refreshes the snapshot store after recording", async () => {
    await recordSnapshot([asset(500)]);

    const { snapshots } = useNetWorthSnapshotStore.getState();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].totalAssets).toBe(500);
  });

  it("records an empty snapshot (all zeros) when there are no items at all", async () => {
    await recordSnapshot([]);

    const rows = await db.netWorthSnapshots.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
  });
});
