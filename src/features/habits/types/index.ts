import type { SyncMeta } from "@/utils/syncMeta";

export type HabitFrequency = "daily" | "weekly";

export interface Habit extends SyncMeta {
  id?: number;
  name: string;
  frequency: HabitFrequency;
  // ISO "YYYY-MM-DD" local dates, one entry per calendar day checked in —
  // for both frequencies. A weekly habit doesn't store a "week bucket" key,
  // just the real day it was checked in; computeStreak (see utils/streak.ts)
  // is what buckets these into weeks.
  completedDates: string[];
  createdAt: string;
}
