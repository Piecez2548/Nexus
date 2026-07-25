import { z } from "zod";

export const budgetPeriodEnum = z.enum(["monthly", "weekly", "yearly"]);

export const budgetSchema = z.object({
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  amount: z
    .number({ error: "กรุณากรอกจำนวนเงิน" })
    .positive("จำนวนเงินต้องมากกว่า 0"),
  period: budgetPeriodEnum,
});

export type BudgetFormData = z.infer<typeof budgetSchema>;
