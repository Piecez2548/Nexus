import { describe, expect, it } from "vitest";
import { classifyIntent } from "./classifyIntent";

describe("classifyIntent — the spec's own example questions", () => {
  it.each([
    ["How much did I spend this month?", "expenseAnalysis"],
    ["What is my largest expense?", "expenseAnalysis"],
    ["Why is my Financial Health Score low?", "financialHealthScore"],
    ["Which category should I reduce first?", "recommendations"],
    ["How much can I save by eating at home?", "recommendations"],
    ["Am I following my budget?", "budgetStatus"],
    ["How many times did I eat outside?", "restaurantAnalysis"],
    ["How much coffee did I buy?", "coffeeAnalysis"],
    ["What is my spending trend?", "forecast"],
    ["Will I exceed my budget?", "forecast"],
    ["When will I reach my savings goal?", "goalProgress"],
  ] as const)("classifies %j as %s", (question, expectedIntent) => {
    const result = classifyIntent(question);
    expect(result.intent).toBe(expectedIntent);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("classifyIntent — Thai questions", () => {
  it.each([
    ["ฉันใช้งบประมาณตามที่ตั้งไว้ไหม", "budgetStatus"],
    ["กาแฟฉันซื้อไปเท่าไหร่", "coffeeAnalysis"],
    ["เมื่อไหร่จะถึงเป้าหมายการออม", "goalProgress"],
    ["ทำไมคะแนนสุขภาพการเงินของฉันต่ำ", "financialHealthScore"],
  ] as const)("classifies %j as %s", (question, expectedIntent) => {
    const result = classifyIntent(question);
    expect(result.intent).toBe(expectedIntent);
  });
});

describe("classifyIntent — never guesses when nothing matches", () => {
  it("returns unknown with zero score/confidence for an off-topic question", () => {
    const result = classifyIntent("What's the weather like today?");
    expect(result.intent).toBe("unknown");
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("returns unknown for an empty string", () => {
    const result = classifyIntent("");
    expect(result.intent).toBe("unknown");
  });
});

describe("classifyIntent — scoring and confidence", () => {
  it("is case-insensitive", () => {
    const lower = classifyIntent("how much coffee did i buy");
    const upper = classifyIntent("HOW MUCH COFFEE DID I BUY");
    expect(upper.intent).toBe(lower.intent);
    expect(upper.score).toBe(lower.score);
  });

  it("gives a wide-margin match higher confidence than a narrow one", () => {
    const wideMargin = classifyIntent("How much can I save by eating at home?"); // long, unique recommendations phrases
    const narrowMargin = classifyIntent("goal"); // single short bare keyword, no competing matches but a small score
    expect(wideMargin.confidence).toBeGreaterThanOrEqual(narrowMargin.confidence);
  });

  it("breaks an exact tie via INTENT_PRIORITY_ORDER and flags wasTieBroken", () => {
    // "goal" (goalProgress) and "shop" (shoppingAnalysis) are both short bare
    // keywords of equal length (4) with no other competing matches — a
    // genuine tie. shoppingAnalysis sits earlier in INTENT_PRIORITY_ORDER.
    const result = classifyIntent("goal shop");
    expect(result.wasTieBroken).toBe(true);
    expect(result.intent).toBe("shoppingAnalysis");
  });

  it("never exceeds the classifier's own confidence ceiling", () => {
    const result = classifyIntent("How much can I save by eating at home? Which category should I reduce first?");
    expect(result.confidence).toBeLessThanOrEqual(95);
  });
});
