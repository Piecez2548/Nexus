import type { ExerciseCategory } from "@/features/workouts/types";

type Translate = (key: string) => string;

export function getExerciseCategoryLabels(t: Translate): Record<ExerciseCategory, string> {
  return {
    strength: t("workouts.categoryStrength"),
    cardio: t("workouts.categoryCardio"),
    hiit: t("workouts.categoryHiit"),
    core: t("workouts.categoryCore"),
    flexibility: t("workouts.categoryFlexibility"),
    other: t("workouts.categoryOther"),
  };
}

export const CATEGORY_BADGE_CLASS: Record<ExerciseCategory, string> = {
  strength: "bg-brand-500/15 text-brand-500",
  cardio: "bg-red-500/15 text-red-500",
  hiit: "bg-orange-500/15 text-orange-500",
  core: "bg-amber-500/15 text-amber-500",
  flexibility: "bg-sky-500/15 text-sky-500",
  other: "bg-zinc-500/15 text-zinc-500",
};
