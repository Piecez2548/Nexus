import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { merchantRepository } from "./merchantRepository";

describe("merchantRepository", () => {
  beforeEach(async () => {
    await db.merchants.clear();
  });

  it("adds, lists, updates, and removes a merchant", async () => {
    const id = await merchantRepository.add({ name: "Starbucks", category: "Food" });

    let all = await merchantRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Starbucks", category: "Food" });

    await merchantRepository.update(id, { name: "Starbucks", category: "Coffee" });
    all = await merchantRepository.getAll();
    expect(all[0].category).toBe("Coffee");

    await merchantRepository.remove(id);
    all = await merchantRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("persists the optional icon field", async () => {
    await merchantRepository.add({ name: "7-Eleven", category: "Convenience", icon: "shopping-bag" });

    const [merchant] = await merchantRepository.getAll();
    expect(merchant.icon).toBe("shopping-bag");
  });

  it("rejects a duplicate name at the Dexie index level (the service layer is expected to check first)", async () => {
    await merchantRepository.add({ name: "Starbucks", category: "Food" });
    await expect(merchantRepository.add({ name: "Starbucks", category: "Coffee" })).rejects.toThrow();
  });
});
