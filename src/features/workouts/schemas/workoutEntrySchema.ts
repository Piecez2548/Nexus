import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

// Covers only the primitive, user-editable fields. `route` (GPS-tracked
// entries) is carried as separate component state, not an RHF field --
// mirrors HabitFormData excluding `completedDates`.
export function workoutEntrySchema(t: TranslateFn) {
  return z.object({
    exerciseName: z.string().min(1, t("validation.workoutEntry.exerciseRequired")),
    date: z.string().min(1, t("validation.workoutEntry.dateRequired")),
    reps: z.number().optional(),
    rounds: z.number().optional(),
    durationMinutes: z.number().optional(),
    distanceMeters: z.number().optional(),
    caloriesBurned: z.number(),
    note: z.string().optional(),
  });
}

export type WorkoutEntryFormData = z.infer<ReturnType<typeof workoutEntrySchema>>;
