import { z } from "zod";

export const holdingSchema = z.object({
  symbol: z.string().min(1, "กรุณากรอกสัญลักษณ์"),
  market: z.enum(
    ["stocks", "etf", "forex", "cfd", "crypto", "futures", "options", "indices", "commodities", "custom"],
    { error: "กรุณาเลือกตลาด" }
  ),
  quantity: z.number({ error: "กรุณากรอกจำนวน" }).positive("จำนวนต้องมากกว่า 0"),
  avgCostPrice: z.number({ error: "กรุณากรอกราคาต้นทุนเฉลี่ย" }).min(0, "ราคาต้นทุนต้องไม่ติดลบ"),
  notes: z.string().optional(),
});

export type HoldingFormData = z.infer<typeof holdingSchema>;
