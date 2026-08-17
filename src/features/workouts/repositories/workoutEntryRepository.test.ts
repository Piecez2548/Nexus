import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { workoutEntryRepository } from "./workoutEntryRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { WorkoutEntry } from "@/features/workouts/types";

function sample(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    exerciseName: "Push-up",
    date: "2026-08-17",
    reps: 10,
    rounds: 3,
    caloriesBurned: 15,
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("workoutEntryRepository", () => {
  beforeEach(async () => {
    await db.workoutEntries.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an entry when encryption is off", async () => {
    const id = await workoutEntryRepository.add(sample());

    let all = await workoutEntryRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ exerciseName: "Push-up", reps: 10 });

    await workoutEntryRepository.update(id, sample({ reps: 12 }));
    all = await workoutEntryRepository.getAll();
    expect(all[0].reps).toBe(12);

    await workoutEntryRepository.remove(id);
    all = await workoutEntryRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes an entry identically when encryption is on, including a GPS route", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const route = [
      { lat: 13.75, lng: 100.5, t: 1000 },
      { lat: 13.751, lng: 100.501, t: 2000 },
    ];
    const id = await workoutEntryRepository.add(sample({ exerciseName: "Running", route, distanceMeters: 150 }));

    const all = await workoutEntryRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].route).toEqual(route);

    const rawRow = await db.workoutEntries.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.exerciseName).toBeUndefined();

    await workoutEntryRepository.remove(id);
    expect(await workoutEntryRepository.getAll()).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove", async () => {
    const id = await workoutEntryRepository.add(sample());
    const [before] = await workoutEntryRepository.getAll();

    await workoutEntryRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "workoutEntries", syncId: before.syncId });
  });
});
