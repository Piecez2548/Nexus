import { toLocalDateString } from "@/utils/localDate";
import type { WorkoutEntry } from "@/features/workouts/types";

export interface TodaySummary {
  totalCalories: number;
  totalDurationMinutes: number;
  totalReps: number;
  totalRounds: number;
  exerciseCount: number; // distinct exerciseName logged today
}

// Pure in-memory reduction over the store's already-loaded WorkoutEntry[] --
// matches this app's existing convention of loading full tables and
// deriving summaries in memory (same as habitStore.checkIn's in-memory
// find) rather than a targeted Dexie query.
export function computeTodaySummary(entries: WorkoutEntry[], today: Date = new Date()): TodaySummary {
  const todayStr = toLocalDateString(today);
  const todaysEntries = entries.filter((e) => e.date === todayStr);

  return {
    totalCalories: todaysEntries.reduce((sum, e) => sum + (e.caloriesBurned ?? 0), 0),
    totalDurationMinutes: todaysEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    totalReps: todaysEntries.reduce((sum, e) => sum + (e.reps ?? 0) * (e.rounds ?? 1), 0),
    totalRounds: todaysEntries.reduce((sum, e) => sum + (e.rounds ?? 0), 0),
    exerciseCount: new Set(todaysEntries.map((e) => e.exerciseName)).size,
  };
}

// Distinct calendar dates that have at least one logged entry -- feeds the
// 14-dot recent-history strip and streak line (reuses getRecentDates/
// computeStreak from @/features/habits/utils/streak, both pure/generic
// despite living under features/habits/).
export function getLoggedDates(entries: WorkoutEntry[]): string[] {
  return [...new Set(entries.map((e) => e.date))];
}
