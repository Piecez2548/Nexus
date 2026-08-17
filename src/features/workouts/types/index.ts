import type { SyncMeta } from "@/utils/syncMeta";

export type ExerciseCategory = "strength" | "cardio" | "hiit" | "core" | "flexibility" | "other";

export interface WorkoutExercise extends SyncMeta {
  id?: number;
  name: string;
  category: ExerciseCategory;
  icon: string; // key into WORKOUT_ICON_OPTIONS (constants/icons.ts)
  color: string; // hex, e.g. "#3b82f6"
  caloriesPerMinute?: number;
  caloriesPerRep?: number;
  // More accurate basis for GPS-tracked cardio (effort scales with pace, not
  // just time).
  caloriesPerKm?: number;
  // True for Running/Cycling/Walking-style moves -- Workouts.tsx offers
  // "Track with GPS" instead of manual reps/duration entry for these.
  gpsTracked?: boolean;
  // Explicit demo link; falls back to a YouTube search built from `name`
  // when absent (see utils/youtubeLink.ts).
  youtubeUrl?: string;
  createdAt: string;
}

// One recorded GPS position, epoch ms timestamp.
export interface GeoPoint {
  lat: number;
  lng: number;
  t: number;
}

export interface WorkoutEntry extends SyncMeta {
  id?: number;
  // Denormalized copy of WorkoutExercise.name, like Transaction.category --
  // survives the catalog entry being renamed or deleted later.
  exerciseName: string;
  date: string; // "YYYY-MM-DD" local, via @/utils/localDate
  reps?: number; // reps per round
  rounds?: number; // rounds/sets performed
  durationMinutes?: number;
  distanceMeters?: number; // GPS-tracked entries only
  route?: GeoPoint[]; // GPS-tracked entries only
  // Computed at save time from calorieCalc.ts, user-editable, then frozen --
  // never recomputed later even if the catalog exercise's rates change.
  caloriesBurned: number;
  note?: string;
  createdAt: string;
}
