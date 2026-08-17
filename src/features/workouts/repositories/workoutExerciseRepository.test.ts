import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { workoutExerciseRepository } from "./workoutExerciseRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { WorkoutExercise } from "@/features/workouts/types";

function sample(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    name: "Push-up",
    category: "strength",
    icon: "dumbbell",
    color: "#3b82f6",
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("workoutExerciseRepository", () => {
  beforeEach(async () => {
    await db.workoutExercises.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an exercise when encryption is off", async () => {
    const id = await workoutExerciseRepository.add(sample());

    let all = await workoutExerciseRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Push-up", category: "strength" });

    await workoutExerciseRepository.update(id, sample({ caloriesPerRep: 0.5 }));
    all = await workoutExerciseRepository.getAll();
    expect(all[0].caloriesPerRep).toBe(0.5);

    await workoutExerciseRepository.remove(id);
    all = await workoutExerciseRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes an exercise identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await workoutExerciseRepository.add(sample());

    let all = await workoutExerciseRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Push-up" });

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.workoutExercises.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.name).toBeUndefined();

    await workoutExerciseRepository.remove(id);
    all = await workoutExerciseRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove", async () => {
    const id = await workoutExerciseRepository.add(sample());
    const [before] = await workoutExerciseRepository.getAll();

    await workoutExerciseRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "workoutExercises", syncId: before.syncId });
  });
});
