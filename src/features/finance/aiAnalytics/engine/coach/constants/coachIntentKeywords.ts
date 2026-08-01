// Bilingual (EN+TH) keyword table for classifyIntent.ts — mirrors
// engine/constants/behaviorKeywords.ts's own style exactly (flat typed
// string arrays, `as const satisfies Record<...>`), applied one level up:
// that file classifies TRANSACTIONS by category, this classifies
// QUESTIONS by intent, but the substring-match idiom is identical and
// already proven correct for Thai text.
//
// Longer, more specific phrases are listed alongside short generic words
// deliberately — classifyIntent.ts scores by SUM OF MATCHED KEYWORD
// LENGTH, so a distinctive phrase like "will i exceed" naturally outweighs
// a short generic word like "budget" that also appears in a different
// intent's own question, resolving ambiguity without any extra tuning
// logic.

import type { CoachIntent } from "@/features/finance/aiAnalytics/engine/coach/types";

export const COACH_INTENT_KEYWORDS = {
  financialOverview: ["financial overview", "overview", "how am i doing financially", "financial summary", "financial situation", "ภาพรวมการเงิน", "สรุปการเงิน", "สถานะการเงินของฉัน", "ภาพรวม"],
  expenseAnalysis: ["how much did i spend", "spend this month", "spent", "spending", "expense", "expenses", "largest expense", "biggest expense", "ใช้จ่ายไปเท่าไหร่", "รายจ่าย", "ใช้เงินไปเท่าไหร่", "ค่าใช้จ่ายก้อนใหญ่ที่สุด", "รายจ่ายที่มากที่สุด"],
  incomeAnalysis: ["income", "how much did i earn", "my income", "earned", "salary", "รายได้", "รายรับ", "หาเงินได้เท่าไหร่", "เงินเดือน"],
  budgetStatus: ["am i following my budget", "following my budget", "am i on budget", "budget status", "budget", "งบประมาณ", "ตามงบ", "งบ"],
  savingsProgress: ["saving rate", "how much have i saved", "savings progress", "am i saving enough", "อัตราการออม", "ออมได้เท่าไหร่", "ความคืบหน้าการออม"],
  cashFlow: ["cash flow", "net cash flow", "money in and out", "กระแสเงินสด", "เงินเข้าออก", "กระแสเงิน"],
  financialHealthScore: ["financial health score", "health score", "why is my score low", "score low", "คะแนนสุขภาพการเงิน", "ทำไมคะแนนต่ำ", "คะแนนต่ำ", "สุขภาพการเงิน"],
  categorySpending: ["category spending", "spending by category", "which category", "how much on category", "หมวดหมู่การใช้จ่าย", "ใช้จ่ายหมวดไหน", "หมวดไหนใช้เยอะ"],
  merchantSpending: ["merchant", "which store", "favorite store", "shop at most", "ร้านค้า", "ร้านไหน", "ร้านที่ใช้บ่อย"],
  restaurantAnalysis: ["how many times did i eat outside", "eat outside", "eating out", "dine out", "dining", "restaurant", "กินข้าวนอกบ้านกี่ครั้ง", "ทานข้าวนอกบ้าน", "ร้านอาหาร"],
  coffeeAnalysis: ["how much coffee", "coffee", "กาแฟ", "ซื้อกาแฟ"],
  shoppingAnalysis: ["shopping", "how much shopping", "bought", "shop", "ช้อปปิ้ง", "ซื้อของ", "ช้อป"],
  forecast: ["forecast", "predict", "prediction", "will i exceed", "exceed my budget", "will i go over", "spending trend", "what is my trend", "trend", "พยากรณ์", "คาดการณ์", "จะเกินงบ", "แนวโน้มการใช้จ่าย", "แนวโน้ม", "จะเกินไหม"],
  goalProgress: ["when will i reach", "reach my goal", "reach my savings goal", "savings goal", "goal", "เมื่อไหร่จะถึงเป้าหมาย", "เป้าหมายการออม", "เป้าหมาย"],
  recommendations: [
    "which category should i reduce",
    "reduce first",
    "how much can i save by",
    "save by eating at home",
    "eating at home",
    "cook at home",
    "recommend",
    "recommendation",
    "suggestion",
    "should i reduce",
    "แนะนำ",
    "คำแนะนำ",
    "ควรลดหมวดไหนก่อน",
    "ประหยัดได้เท่าไหร่ถ้า",
    "ทำอาหารกินเอง",
  ],
  behaviorAnalysis: ["behavior", "my habits", "spending habits", "spending behavior", "พฤติกรรม", "นิสัยการใช้จ่าย", "พฤติกรรมการใช้จ่าย"],
} as const satisfies Record<CoachIntent, readonly string[]>;

// Most-generally-useful intents first — used to deterministically break an
// exact top-score tie between two or more intents.
export const INTENT_PRIORITY_ORDER: CoachIntent[] = [
  "financialOverview",
  "cashFlow",
  "expenseAnalysis",
  "incomeAnalysis",
  "budgetStatus",
  "savingsProgress",
  "financialHealthScore",
  "categorySpending",
  "merchantSpending",
  "restaurantAnalysis",
  "coffeeAnalysis",
  "shoppingAnalysis",
  "forecast",
  "goalProgress",
  "recommendations",
  "behaviorAnalysis",
];
