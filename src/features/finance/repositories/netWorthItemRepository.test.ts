import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { netWorthItemRepository } from "./netWorthItemRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { NetWorthItem } from "@/features/finance/types";

function sample(overrides: Partial<NetWorthItem> = {}): NetWorthItem {
  return {
    kind: "asset",
    name: "House",
    category: "property",
    value: 3000000,
    icon: "house",
    color: "#16a34a",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("netWorthItemRepository", () => {
  beforeEach(async () => {
    await db.netWorthItems.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an item when encryption is off", async () => {
    const id = await netWorthItemRepository.add(sample());

    let all = await netWorthItemRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "House", kind: "asset", value: 3000000 });

    await netWorthItemRepository.update(id, sample({ value: 3200000 }));
    all = await netWorthItemRepository.getAll();
    expect(all[0].value).toBe(3200000);

    await netWorthItemRepository.remove(id);
    all = await netWorthItemRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes an item identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await netWorthItemRepository.add(sample({ kind: "liability", category: "mortgage", value: 1500000 }));

    let all = await netWorthItemRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ kind: "liability", value: 1500000 });

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.netWorthItems.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.name).toBeUndefined();
    expect(rawRow?.value).toBeUndefined();

    await netWorthItemRepository.remove(id);
    all = await netWorthItemRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove", async () => {
    const id = await netWorthItemRepository.add(sample());
    const [before] = await netWorthItemRepository.getAll();

    await netWorthItemRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "netWorthItems", syncId: before.syncId });
  });
});
