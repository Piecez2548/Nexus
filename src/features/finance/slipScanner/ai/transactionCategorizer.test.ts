import { describe, expect, it } from "vitest";

import { categorize, type SlipCategory } from "./transactionCategorizer";

describe("categorize", () => {
  it("maps keywords (Thai + English) to categories", () => {
    expect(categorize("ร้านกาแฟ Starbucks").category).toBe("Food");
    expect(categorize("Grab taxi").category).toBe("Transport");
    expect(categorize("ค่าไฟฟ้า").category).toBe("Bills");
    expect(categorize("Shopee order").category).toBe("Shopping");
    expect(categorize("เงินเดือน").category).toBe("Salary");
    expect(categorize("Netflix").category).toBe("Entertainment");
  });

  it("returns Others with low confidence when nothing matches", () => {
    const guess = categorize("xyz random");
    expect(guess.category).toBe("Others");
    expect(guess.confidence).toBeLessThan(0.5);
    expect(guess.source).toBe("default");
  });

  it("lets a learned correction take precedence over keywords", () => {
    const learned = new Map<string, SlipCategory>([["starbucks", "Others"]]);
    const guess = categorize("Starbucks", learned);
    expect(guess.category).toBe("Others");
    expect(guess.confidence).toBe(1);
    expect(guess.source).toBe("learned");
  });

  it("handles empty text", () => {
    expect(categorize("   ").category).toBe("Others");
  });
});
