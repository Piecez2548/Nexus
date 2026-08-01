import { z } from "zod";
import { transactionTypeEnum } from "@/features/finance/schemas/transactionSchema";
import type { TranslateFn } from "@/i18n/useTranslation";

export function transactionTemplateSchema(t: TranslateFn) {
  return z
    .object({
      name: z.string().min(1, t("validation.transactionTemplate.nameRequired")),
      type: transactionTypeEnum,
      category: z.string().optional(),
      account: z.string().min(1, t("validation.common.accountRequired")),
      toAccount: z.string().optional(),
      amount: z.number().positive(t("validation.common.amountPositive")).optional(),
      recipient: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if ((data.type === "income" || data.type === "expense") && !data.category) {
        ctx.addIssue({
          code: "custom",
          path: ["category"],
          message: t("validation.common.categoryRequired"),
        });
      }

      if (data.type === "transfer" && !data.toAccount) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccount"],
          message: t("validation.common.toAccountRequired"),
        });
      }
    });
}

export type TransactionTemplateFormData = z.infer<ReturnType<typeof transactionTemplateSchema>>;
