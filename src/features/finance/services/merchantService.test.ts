import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { merchantService } from "./merchantService";

describe("merchantService", () => {
  beforeEach(async () => {
    await db.merchants.clear();
  });

  it("creates and lists a merchant", async () => {
    await merchantService.create({ name: "Starbucks", category: "Food" });
    const all = await merchantService.list();
    expect(all).toHaveLength(1);
  });

  it("rejects creating a merchant whose name already exists", async () => {
    await merchantService.create({ name: "Starbucks", category: "Food" });
    await expect(merchantService.create({ name: "Starbucks", category: "Coffee" })).rejects.toThrow();

    const all = await merchantService.list();
    expect(all).toHaveLength(1);
  });

  it("allows renaming a merchant to a name that is not otherwise taken", async () => {
    const id = await merchantService.create({ name: "Starbucks", category: "Food" });
    await merchantService.update(id, { name: "Starbucks Coffee", category: "Food" });

    const [merchant] = await merchantService.list();
    expect(merchant.name).toBe("Starbucks Coffee");
  });

  it("allows updating a merchant without changing its name (no false collision with itself)", async () => {
    const id = await merchantService.create({ name: "Starbucks", category: "Food" });
    await merchantService.update(id, { name: "Starbucks", category: "Coffee" });

    const [merchant] = await merchantService.list();
    expect(merchant.category).toBe("Coffee");
  });

  it("rejects renaming a merchant to a name already used by a different merchant", async () => {
    await merchantService.create({ name: "Starbucks", category: "Food" });
    const id = await merchantService.create({ name: "7-Eleven", category: "Convenience" });

    await expect(merchantService.update(id, { name: "Starbucks", category: "Convenience" })).rejects.toThrow();
  });

  it("removes a merchant", async () => {
    const id = await merchantService.create({ name: "Starbucks", category: "Food" });
    await merchantService.remove(id);
    expect(await merchantService.list()).toHaveLength(0);
  });
});
