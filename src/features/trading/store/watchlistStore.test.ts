import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useWatchlistStore } from "./watchlistStore";
import { watchlistService } from "../services/watchlistService";

describe("watchlistStore", () => {
  beforeEach(async () => {
    await db.watchlistItems.clear();
    useWatchlistStore.setState({ watchlistItems: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("adds, lists, updates, and deletes a watchlist item end to end", async () => {
    await useWatchlistStore.getState().addWatchlistItem({ symbol: "AAPL", market: "stocks" });
    expect(useWatchlistStore.getState().watchlistItems).toHaveLength(1);

    const [item] = useWatchlistStore.getState().watchlistItems;
    await useWatchlistStore.getState().updateWatchlistItem(item.id!, { symbol: "AAPL", market: "stocks", targetPrice: 200 });
    expect(useWatchlistStore.getState().watchlistItems[0].targetPrice).toBe(200);

    await useWatchlistStore.getState().deleteWatchlistItem(item.id!);
    expect(useWatchlistStore.getState().watchlistItems).toHaveLength(0);
  });

  it("sets an error and stops loading when loadWatchlistItems fails", async () => {
    vi.spyOn(watchlistService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useWatchlistStore.getState().loadWatchlistItems();

    expect(useWatchlistStore.getState().loading).toBe(false);
    expect(useWatchlistStore.getState().error).toBe("DB unavailable");
  });

  it("addWatchlistItem rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(watchlistService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useWatchlistStore.getState().addWatchlistItem({ symbol: "AAPL", market: "stocks" })
    ).rejects.toThrow("Write failed");

    expect(useWatchlistStore.getState().error).toBeNull();
  });
});
