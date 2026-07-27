import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { calendarEventRepository } from "./calendarEventRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { CalendarEvent } from "@/features/calendar/types";

function sample(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    title: "Team meeting",
    startAt: "2026-07-15T09:00",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calendarEventRepository", () => {
  beforeEach(async () => {
    await db.calendarEvents.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an event when encryption is off", async () => {
    const id = await calendarEventRepository.add(sample());

    let all = await calendarEventRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Team meeting", startAt: "2026-07-15T09:00" });

    await calendarEventRepository.update(id, sample({ title: "Team meeting (updated)" }));
    all = await calendarEventRepository.getAll();
    expect(all[0].title).toBe("Team meeting (updated)");

    await calendarEventRepository.remove(id);
    all = await calendarEventRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes an event identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await calendarEventRepository.add(sample());

    let all = await calendarEventRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Team meeting" });

    await calendarEventRepository.update(id, sample({ title: "Team meeting (updated)" }));
    all = await calendarEventRepository.getAll();
    expect(all[0].title).toBe("Team meeting (updated)");

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.calendarEvents.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBeUndefined();

    await calendarEventRepository.remove(id);
    all = await calendarEventRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove, even when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await calendarEventRepository.add(sample());
    const [before] = await calendarEventRepository.getAll();

    await calendarEventRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "calendarEvents", syncId: before.syncId });
  });
});
