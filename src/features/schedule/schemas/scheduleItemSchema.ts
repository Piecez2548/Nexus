import { z } from "zod";

import { repeatRuleSchema } from "@/features/reminders/schemas/repeatRuleSchema";
import type { TranslateFn } from "@/i18n/useTranslation";

export function scheduleItemSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(1, t("validation.common.itemNameRequired")),
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
    startTime: z.string().min(1, t("validation.scheduleItem.startTimeRequired")),
    endTime: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
    repeat: repeatRuleSchema(t),
    enabled: z.boolean(),
    reminderEnabled: z.boolean().optional(),
    reminderOffsetMinutes: z
      .union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)])
      .nullable()
      .optional(),
  });
}

export type ScheduleItemFormData = z.infer<ReturnType<typeof scheduleItemSchema>>;
