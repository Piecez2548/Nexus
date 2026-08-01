import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export function todoSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(1, t("validation.todo.titleRequired")),
    notes: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
  });
}

export type TodoFormData = z.infer<ReturnType<typeof todoSchema>>;
