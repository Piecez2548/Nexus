import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { scheduleItemRepository } from "./scheduleItemRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { ScheduleItem } from "@/features/schedule/types";

function sample(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    title: "Morning workout",
    icon: "dumbbell",
    color: "#ef4444",
    startTime: "07:00",
    repeat: { frequency: "daily" },
    enabled: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scheduleItemRepository", () => {
  beforeEach(async () => {
    await db.scheduleItems.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an item when encryption is off", async () => {
    const id = await scheduleItemRepository.add(sample());

    let all = await scheduleItemRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Morning workout", startTime: "07:00" });

    await scheduleItemRepository.update(id, sample({ title: "Morning workout (updated)" }));
    all = await scheduleItemRepository.getAll();
    expect(all[0].title).toBe("Morning workout (updated)");

    await scheduleItemRepository.remove(id);
    all = await scheduleItemRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes an item identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await scheduleItemRepository.add(sample());

    let all = await scheduleItemRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Morning workout" });

    await scheduleItemRepository.update(id, sample({ title: "Morning workout (updated)" }));
    all = await scheduleItemRepository.getAll();
    expect(all[0].title).toBe("Morning workout (updated)");

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.scheduleItems.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBeUndefined();

    await scheduleItemRepository.remove(id);
    all = await scheduleItemRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove, even when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await scheduleItemRepository.add(sample());
    const [before] = await scheduleItemRepository.getAll();

    await scheduleItemRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "scheduleItems", syncId: before.syncId });
  });
});
