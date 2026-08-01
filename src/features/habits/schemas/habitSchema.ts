import { z } from "zod";

import { repeatRuleSchema } from "@/features/reminders/schemas/repeatRuleSchema";
import type { TranslateFn } from "@/i18n/useTranslation";

export function habitSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.habit.nameRequired")),
    frequency: z.enum(["daily", "weekly"], { error: t("validation.habit.frequencyRequired") }),
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().optional(),
    reminderRepeat: repeatRuleSchema(t).nullable().optional(),
  });
}

export type HabitFormData = z.infer<ReturnType<typeof habitSchema>>;
