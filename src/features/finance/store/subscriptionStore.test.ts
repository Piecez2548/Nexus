import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useSubscriptionStore } from "./subscriptionStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { Subscription } from "@/features/finance/types";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
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

describe("subscriptionStore", () => {
  beforeEach(async () => {
    await db.subscriptions.clear();
    await db.syncTombstones.clear();
    useSubscriptionStore.setState({ subscriptions: [], loading: false, error: null });
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds a subscription and reflects it in state", async () => {
    await useSubscriptionStore.getState().addSubscription(subscription());

    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
    expect(useSubscriptionStore.getState().subscriptions[0]).toMatchObject({ name: "Netflix", status: "active" });
  });

  it("reloads persisted subscriptions from Dexie via loadSubscriptions (survives a fresh store read)", async () => {
    await useSubscriptionStore.getState().addSubscription(subscription());

    // Simulate a fresh mount reading whatever is actually persisted, not
    // just in-memory state left over from addSubscription.
    useSubscriptionStore.setState({ subscriptions: [], loading: false, error: null });
    await useSubscriptionStore.getState().loadSubscriptions();

    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
    expect(useSubscriptionStore.getState().subscriptions[0]).toMatchObject({ name: "Netflix" });
  });

  it("updates a subscription's amount and persists the change", async () => {
    await useSubscriptionStore.getState().addSubscription(subscription({ amount: 419 }));
    const [sub] = useSubscriptionStore.getState().subscriptions;

    await useSubscriptionStore.getState().updateSubscription(sub.id!, { ...sub, amount: 449 });

    expect(useSubscriptionStore.getState().subscriptions[0].amount).toBe(449);
  });

  it("transitions status active -> paused -> cancelled, keeping the record (not deleting it) at every step", async () => {
    await useSubscriptionStore.getState().addSubscription(subscription({ status: "active" }));
    const [sub] = useSubscriptionStore.getState().subscriptions;

    await useSubscriptionStore.getState().updateSubscription(sub.id!, { ...sub, status: "paused" });
    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
    expect(useSubscriptionStore.getState().subscriptions[0].status).toBe("paused");

    await useSubscriptionStore.getState().updateSubscription(sub.id!, { ...sub, status: "cancelled" });
    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
    expect(useSubscriptionStore.getState().subscriptions[0].status).toBe("cancelled");
  });

  it("deletes a subscription", async () => {
    await useSubscriptionStore.getState().addSubscription(subscription());
    const [sub] = useSubscriptionStore.getState().subscriptions;

    await useSubscriptionStore.getState().deleteSubscription(sub.id!);

    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(0);
  });

  it("supports multiple independent subscriptions with the same name (no silent-duplicate blocking beyond normal form re-submit protection)", async () => {
    // Matches this app's existing convention -- Account/Category/Goal/
    // Holding/NetWorthItem all allow same-name entries too; nothing seeds
    // default subscriptions the way Account/Category do across devices, so
    // the cross-device-reseed duplicate class those tables guard against
    // doesn't apply here.
    await useSubscriptionStore.getState().addSubscription(subscription({ name: "Netflix" }));
    await useSubscriptionStore.getState().addSubscription(subscription({ name: "Netflix" }));

    expect(useSubscriptionStore.getState().subscriptions).toHaveLength(2);
  });
});
