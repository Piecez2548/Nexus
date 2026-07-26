import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { holdingRepository } from "./holdingRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { Holding } from "@/features/portfolio/types";

// Pins the invariant that routing holdingRepository through
// encryptedRepository (see createEncryptedRepository in
// src/database/encryptedRepository.ts) is invisible to callers — the same
// add/update/remove/getAll contract holds whether or not encryption is
// enabled on this install.
function sample(overrides: Partial<Holding> = {}): Holding {
  return {
    symbol: "AAPL",
    market: "stocks",
    quantity: 10,
    avgCostPrice: 100,
    createdAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

describe("holdingRepository", () => {
  beforeEach(async () => {
    await db.holdings.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes a holding when encryption is off", async () => {
    const id = await holdingRepository.add(sample());

    let all = await holdingRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ symbol: "AAPL", market: "stocks", quantity: 10 });

    await holdingRepository.update(id, sample({ currentPrice: 120 }));
    all = await holdingRepository.getAll();
    expect(all[0].currentPrice).toBe(120);

    await holdingRepository.remove(id);
    all = await holdingRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes a holding identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await holdingRepository.add(sample());

    let all = await holdingRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ symbol: "AAPL", market: "stocks", quantity: 10 });

    await holdingRepository.update(id, sample({ currentPrice: 120 }));
    all = await holdingRepository.getAll();
    expect(all[0].currentPrice).toBe(120);

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.holdings.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.symbol).toBeUndefined();

    await holdingRepository.remove(id);
    all = await holdingRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove, even when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await holdingRepository.add(sample());
    const [before] = await holdingRepository.getAll();

    await holdingRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "holdings", syncId: before.syncId });
  });
});
