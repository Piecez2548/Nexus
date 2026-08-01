import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const categoryTypeEnum = z.enum(["income", "expense"]);

export function categorySchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("validation.category.nameRequired")),
    type: categoryTypeEnum,
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
  });
}

export type CategoryFormData = z.infer<ReturnType<typeof categorySchema>>;
