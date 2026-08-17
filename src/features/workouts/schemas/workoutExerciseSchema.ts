import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const exerciseCategoryEnum = z.enum(["strength", "cardio", "hiit", "core", "flexibility", "other"]);

export function workoutExerciseSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.workoutExercise.nameRequired")),
    category: exerciseCategoryEnum,
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
    caloriesPerMinute: z.number().optional(),
    caloriesPerRep: z.number().optional(),
    caloriesPerKm: z.number().optional(),
    gpsTracked: z.boolean().optional(),
    youtubeUrl: z.string().optional(),
  });
}

export type WorkoutExerciseFormData = z.infer<ReturnType<typeof workoutExerciseSchema>>;
