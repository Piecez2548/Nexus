import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useMerchantStore } from "./merchantStore";
import { merchantService } from "../services/merchantService";

describe("merchantStore", () => {
  beforeEach(async () => {
    await db.merchants.clear();
    useMerchantStore.setState({ merchants: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("adds, lists, updates, and deletes a merchant end to end", async () => {
    await useMerchantStore.getState().addMerchant({ name: "Starbucks", category: "Food" });
    expect(useMerchantStore.getState().merchants).toHaveLength(1);

    const [merchant] = useMerchantStore.getState().merchants;
    await useMerchantStore.getState().updateMerchant(merchant.id!, { name: "Starbucks", category: "Coffee" });
    expect(useMerchantStore.getState().merchants[0].category).toBe("Coffee");

    await useMerchantStore.getState().deleteMerchant(merchant.id!);
    expect(useMerchantStore.getState().merchants).toHaveLength(0);
  });

  it("sets an error and stops loading when loadMerchants fails", async () => {
    vi.spyOn(merchantService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useMerchantStore.getState().loadMerchants();

    expect(useMerchantStore.getState().loading).toBe(false);
    expect(useMerchantStore.getState().error).toBe("DB unavailable");
  });

  it("addMerchant rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(merchantService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useMerchantStore.getState().addMerchant({ name: "Starbucks", category: "Food" })
    ).rejects.toThrow("Write failed");

    expect(useMerchantStore.getState().error).toBeNull();
  });
});
