import { describe, expect, it, beforeEach } from "vitest";
import { categorySuggestionService } from "./categorySuggestionService";
import { db } from "@/database/db";

describe("categorySuggestionService.suggest", () => {
  beforeEach(async () => {
    await db.recipientProfiles.clear();
    await db.merchants.clear();
  });

  it("returns null when nothing matches", async () => {
    const result = await categorySuggestionService.suggest(undefined, "Some Random Title");
    expect(result).toBeNull();
  });

  it("prefers a known recipient profile over the merchant database", async () => {
    await db.recipientProfiles.add({
      recipientKey: "0812345678",
      alias: "ร้านก๋วยเตี๋ยวป้าแดง",
      category: "Food",
      transactionCount: 5,
      totalAmount: 250,
      lastUsedDate: "2026-07-20",
      confidenceScore: 83,
    });

    await db.merchants.add({ name: "0812345678", category: "Others" });

    const result = await categorySuggestionService.suggest("0812345678", "Some title");

    expect(result).toEqual({
      category: "Food",
      account: undefined,
      source: "recipient",
      confidence: 83,
      label: "ร้านก๋วยเตี๋ยวป้าแดง",
    });
  });

  it("falls back to the merchant database matched against the title", async () => {
    await db.merchants.add({ name: "Starbucks", category: "Food" });

    const result = await categorySuggestionService.suggest(undefined, "Starbucks Siam Paragon");

    expect(result).toEqual({
      category: "Food",
      source: "merchant",
      confidence: 50,
      label: "Starbucks",
    });
  });

  it("does not match a merchant when the recipient has no profile and the title doesn't contain one", async () => {
    await db.merchants.add({ name: "Starbucks", category: "Food" });

    const result = await categorySuggestionService.suggest("0899999999", "Random Shop");
    expect(result).toBeNull();
  });
});
