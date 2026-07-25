import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { habitRepository } from "./habitRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { Habit } from "@/features/habits/types";

// Pins the invariant that routing habitRepository through encryptedRepository
// (see createEncryptedRepository in src/database/encryptedRepository.ts) is
// invisible to callers — the same add/update/remove/getAll contract holds
// whether or not encryption is enabled on this install.
function sample(overrides: Partial<Habit> = {}): Habit {
  return {
    name: "Exercise",
    frequency: "daily",
    completedDates: [],
    createdAt: "2026-07-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("habitRepository", () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes a habit when encryption is off", async () => {
    const id = await habitRepository.add(sample());

    let all = await habitRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Exercise", frequency: "daily" });

    await habitRepository.update(id, sample({ completedDates: ["2026-07-25"] }));
    all = await habitRepository.getAll();
    expect(all[0].completedDates).toEqual(["2026-07-25"]);

    await habitRepository.remove(id);
    all = await habitRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes a habit identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await habitRepository.add(sample());

    let all = await habitRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Exercise", frequency: "daily" });

    await habitRepository.update(id, sample({ completedDates: ["2026-07-25"] }));
    all = await habitRepository.getAll();
    expect(all[0].completedDates).toEqual(["2026-07-25"]);

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.habits.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.name).toBeUndefined();

    await habitRepository.remove(id);
    all = await habitRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove, even when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await habitRepository.add(sample());
    const [before] = await habitRepository.getAll();

    await habitRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "habits", syncId: before.syncId });
  });
});
