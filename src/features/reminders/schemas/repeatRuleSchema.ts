import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function repeatRuleSchema(t: TranslateFn) {
  return z.discriminatedUnion("frequency", [
    z.object({ frequency: z.literal("daily") }),
    z.object({
      frequency: z.literal("weekly"),
      weekdays: z.array(z.number().min(0).max(6)).min(1, t("validation.repeatRule.weekdaysRequired")),
    }),
  ]);
}

export type RepeatRuleFormData = z.infer<ReturnType<typeof repeatRuleSchema>>;
