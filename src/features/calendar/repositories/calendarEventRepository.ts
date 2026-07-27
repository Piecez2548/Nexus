import { db } from "@/database/db";
import { withSyncMeta } from "@/utils/syncMeta";
import { recordTombstone } from "@/features/sync/tombstones";
import { createEncryptedRepository } from "@/database/encryptedRepository";
import type { CalendarEvent } from "../types";

const encrypted = createEncryptedRepository<CalendarEvent>(db.calendarEvents);

export const calendarEventRepository = {
  getAll: () => encrypted.getAll(),

  add: (event: CalendarEvent) => encrypted.add(withSyncMeta(event)),

  update: (id: number, event: CalendarEvent) =>
    encrypted.update(id, withSyncMeta({ ...event, id })),

  remove: async (id: number) => {
    const existing = await db.calendarEvents.get(id);
    await db.calendarEvents.delete(id);
    await recordTombstone("calendarEvents", existing?.syncId);
  },
};
