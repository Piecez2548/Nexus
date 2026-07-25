import { z } from "zod";
import { transactionTypeEnum } from "@/features/finance/schemas/transactionSchema";

export const transactionTemplateSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อ"),
    type: transactionTypeEnum,
    category: z.string().optional(),
    account: z.string().min(1, "กรุณาเลือกบัญชี"),
    toAccount: z.string().optional(),
    amount: z.number().positive("จำนวนเงินต้องมากกว่า 0").optional(),
    recipient: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.type === "income" || data.type === "expense") && !data.category) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "กรุณาเลือกหมวดหมู่",
      });
    }

    if (data.type === "transfer" && !data.toAccount) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccount"],
        message: "กรุณาเลือกบัญชีปลายทาง",
      });
    }
  });

export type TransactionTemplateFormData = z.infer<typeof transactionTemplateSchema>;
