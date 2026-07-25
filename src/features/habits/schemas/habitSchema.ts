import { z } from "zod";

export const habitSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อนิสัย"),
  frequency: z.enum(["daily", "weekly"], { error: "กรุณาเลือกความถี่" }),
});

export type HabitFormData = z.infer<typeof habitSchema>;
