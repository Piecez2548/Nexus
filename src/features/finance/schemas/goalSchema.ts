import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อเป้าหมาย"),
  targetAmount: z
    .number({ error: "กรุณากรอกจำนวนเงินเป้าหมาย" })
    .positive("จำนวนเงินต้องมากกว่า 0"),
  currentAmount: z
    .number({ error: "กรุณากรอกจำนวนเงินปัจจุบัน" })
    .min(0, "จำนวนเงินต้องไม่ติดลบ"),
  deadline: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;
