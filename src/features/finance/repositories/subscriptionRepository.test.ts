import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { subscriptionRepository } from "./subscriptionRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { Subscription } from "@/features/finance/types";

function sample(overrides: Partial<Subscription> = {}): Subscription {
  return {
    name: "Netflix",
    amount: 419,
    billingFrequency: "monthly",
    nextBillingDate: "2026-08-20",
    status: "active",
    icon: "film",
    color: "#dc2626",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("subscriptionRepository", () => {
  beforeEach(async () => {
    await db.subscriptions.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes a subscription when encryption is off", async () => {
    const id = await subscriptionRepository.add(sample());

    let all = await subscriptionRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Netflix", status: "active", amount: 419 });

    await subscriptionRepository.update(id, sample({ status: "paused" }));
    all = await subscriptionRepository.getAll();
    expect(all[0].status).toBe("paused");

    await subscriptionRepository.remove(id);
    all = await subscriptionRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes a subscription identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await subscriptionRepository.add(sample());

    let all = await subscriptionRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Netflix" });

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.subscriptions.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.name).toBeUndefined();
    expect(rawRow?.amount).toBeUndefined();

    await subscriptionRepository.remove(id);
    all = await subscriptionRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove", async () => {
    const id = await subscriptionRepository.add(sample());
    const [before] = await subscriptionRepository.getAll();

    await subscriptionRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "subscriptions", syncId: before.syncId });
  });

  it("persists a status transition across a fresh read (paused subscription stays paused)", async () => {
    const id = await subscriptionRepository.add(sample({ status: "active" }));
    await subscriptionRepository.update(id, sample({ status: "cancelled" }));

    const all = await subscriptionRepository.getAll();
    expect(all[0].status).toBe("cancelled");
  });

  // BUG-12: billingAnchorDay is a plain field on the same row, so it needs
  // no repository-specific handling -- this just confirms it round-trips
  // like every other field, including surviving an update that changes it.
  it("persists billingAnchorDay across a fresh read and lets it be updated", async () => {
    const id = await subscriptionRepository.add(sample({ nextBillingDate: "2026-01-31", billingAnchorDay: 31 }));

    let all = await subscriptionRepository.getAll();
    expect(all[0].billingAnchorDay).toBe(31);

    await subscriptionRepository.update(id, sample({ nextBillingDate: "2026-02-28", billingAnchorDay: 31 }));
    all = await subscriptionRepository.getAll();
    expect(all[0].billingAnchorDay).toBe(31);
    expect(all[0].nextBillingDate).toBe("2026-02-28");
  });

  it("leaves billingAnchorDay undefined for a subscription added without one (a pre-BUG-12 shaped record)", async () => {
    await subscriptionRepository.add(sample());

    const all = await subscriptionRepository.getAll();
    expect(all[0].billingAnchorDay).toBeUndefined();
  });
});
