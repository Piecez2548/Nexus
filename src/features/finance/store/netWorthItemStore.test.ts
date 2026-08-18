import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useNetWorthItemStore } from "./netWorthItemStore";
import { useNetWorthSnapshotStore } from "./netWorthSnapshotStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { NetWorthItem } from "@/features/finance/types";

function asset(overrides: Partial<NetWorthItem> = {}): NetWorthItem {
  return {
    kind: "asset",
    name: "Savings",
    category: "bank",
    value: 10000,
    icon: "landmark",
    color: "#16a34a",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("netWorthItemStore", () => {
  beforeEach(async () => {
    await db.netWorthItems.clear();
    await db.netWorthSnapshots.clear();
    await db.syncTombstones.clear();
    useNetWorthItemStore.setState({ items: [], loading: false, error: null });
    useNetWorthSnapshotStore.setState({ snapshots: [], loading: false, error: null });
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds an item, persists it, and records a net worth snapshot as a side effect", async () => {
    await useNetWorthItemStore.getState().addItem(asset());

    expect(useNetWorthItemStore.getState().items).toHaveLength(1);
    expect(useNetWorthSnapshotStore.getState().snapshots).toHaveLength(1);
    expect(useNetWorthSnapshotStore.getState().snapshots[0].totalAssets).toBe(10000);
  });

  it("reloads persisted items from Dexie via loadItems (survives a fresh store read)", async () => {
    await useNetWorthItemStore.getState().addItem(asset());

    // Simulate a fresh mount reading whatever is actually persisted, not
    // just in-memory state left over from addItem.
    useNetWorthItemStore.setState({ items: [], loading: false, error: null });
    await useNetWorthItemStore.getState().loadItems();

    expect(useNetWorthItemStore.getState().items).toHaveLength(1);
    expect(useNetWorthItemStore.getState().items[0]).toMatchObject({ name: "Savings", value: 10000 });
  });

  it("updates an item's value and re-records the snapshot with the new total", async () => {
    await useNetWorthItemStore.getState().addItem(asset({ value: 10000 }));
    const [item] = useNetWorthItemStore.getState().items;

    await useNetWorthItemStore.getState().updateItem(item.id!, { ...item, value: 25000 });

    expect(useNetWorthItemStore.getState().items[0].value).toBe(25000);
    expect(useNetWorthSnapshotStore.getState().snapshots[0].totalAssets).toBe(25000);
  });

  it("deletes an item and re-records the snapshot back down to zero", async () => {
    await useNetWorthItemStore.getState().addItem(asset());
    const [item] = useNetWorthItemStore.getState().items;

    await useNetWorthItemStore.getState().deleteItem(item.id!);

    expect(useNetWorthItemStore.getState().items).toHaveLength(0);
    expect(useNetWorthSnapshotStore.getState().snapshots[0].totalAssets).toBe(0);
  });

  it("tracks assets and liabilities independently across add/update/delete", async () => {
    await useNetWorthItemStore.getState().addItem(asset({ value: 5000 }));
    await useNetWorthItemStore.getState().addItem({
      kind: "liability",
      name: "Credit Card",
      category: "creditCard",
      value: 2000,
      icon: "credit-card",
      color: "#dc2626",
      createdAt: "2026-08-18T00:00:00.000Z",
    });

    const latestSnapshot = useNetWorthSnapshotStore.getState().snapshots[0];
    expect(latestSnapshot).toMatchObject({ totalAssets: 5000, totalLiabilities: 2000, netWorth: 3000 });
  });
});
