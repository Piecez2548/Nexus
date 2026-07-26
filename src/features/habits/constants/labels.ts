import type { HabitFrequency } from "@/features/habits/types";

type Translate = (key: string) => string;

export function getFrequencyLabels(t: Translate): Record<HabitFrequency, string> {
  return {
    daily: t("habits.frequencyDaily"),
    weekly: t("habits.frequencyWeekly"),
  };
}

export const FREQUENCY_BADGE_CLASS: Record<HabitFrequency, string> = {
  daily: "bg-brand-500/15 text-brand-500",
  weekly: "bg-sky-500/15 text-sky-500",
};
