import { z } from "zod";

import type { TranslateFn } from "@/i18n/useTranslation";

export const netWorthItemKindEnum = z.enum(["asset", "liability"]);

// Combined asset + liability category values -- the form UI (not this
// schema) restricts which subset is offered for a given `kind`, the same
// depth of validation every other kind/type-driven select in this codebase
// uses (e.g. AccountForm's type -> ACCOUNT_TYPE_LABEL_KEYS).
export const netWorthCategoryEnum = z.enum([
  "cash",
  "bank",
  "investment",
  "property",
  "vehicle",
  "crypto",
  "creditCard",
  "loan",
  "mortgage",
  "other",
]);

export function netWorthItemSchema(t: TranslateFn) {
  return z.object({
    kind: netWorthItemKindEnum,
    name: z.string().min(1, t("validation.netWorthItem.nameRequired")),
    category: netWorthCategoryEnum,
    value: z
      .number({ error: t("validation.netWorthItem.valueRequired") })
      .min(0, t("validation.netWorthItem.valueNotNegative")),
    icon: z.string().min(1, t("validation.common.iconRequired")),
    color: z.string().min(1, t("validation.common.colorRequired")),
    note: z.string().optional(),
  });
}

export type NetWorthItemFormData = z.infer<ReturnType<typeof netWorthItemSchema>>;
