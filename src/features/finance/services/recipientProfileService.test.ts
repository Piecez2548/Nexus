import { describe, expect, it, beforeEach } from "vitest";
import { recipientProfileService } from "./recipientProfileService";
import { db } from "@/database/db";

describe("recipientProfileService.recordUsage", () => {
  beforeEach(async () => {
    await db.recipientProfiles.clear();
  });

  it("creates a new profile on first use", async () => {
    await recipientProfileService.recordUsage({
      recipientKey: "0812345678",
      alias: "Coffee",
      category: "Food",
      account: "Cash",
      amount: 58,
      date: "2026-07-21",
    });

    const profiles = await db.recipientProfiles.toArray();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      recipientKey: "0812345678",
      category: "Food",
      transactionCount: 1,
      totalAmount: 58,
      confidenceScore: 50,
    });
  });

  it("accumulates count, total, and confidence on repeated use", async () => {
    for (let i = 0; i < 3; i++) {
      await recipientProfileService.recordUsage({
        recipientKey: "0812345678",
        alias: "Coffee",
        category: "Food",
        account: "Cash",
        amount: 50,
        date: "2026-07-2" + i,
      });
    }

    const profiles = await db.recipientProfiles.toArray();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].transactionCount).toBe(3);
    expect(profiles[0].totalAmount).toBe(150);
    expect(profiles[0].confidenceScore).toBe(75); // 3 / (3+1) * 100
  });

  it("updates the category if the user recategorizes on a later visit", async () => {
    await recipientProfileService.recordUsage({
      recipientKey: "0812345678",
      alias: "Coffee",
      category: "Food",
      amount: 50,
      date: "2026-07-20",
    });

    await recipientProfileService.recordUsage({
      recipientKey: "0812345678",
      alias: "Coffee",
      category: "Entertainment",
      amount: 50,
      date: "2026-07-21",
    });

    const profiles = await db.recipientProfiles.toArray();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].category).toBe("Entertainment");
  });
});
