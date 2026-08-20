import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useStrategyStore } from "./strategyStore";
import { strategyService } from "../services/strategyService";

describe("strategyStore", () => {
  beforeEach(async () => {
    await db.strategies.clear();
    useStrategyStore.setState({ strategies: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("adds, lists, updates, and deletes a strategy end to end", async () => {
    await useStrategyStore.getState().addStrategy({ name: "Breakout" });
    expect(useStrategyStore.getState().strategies).toHaveLength(1);

    const [strategy] = useStrategyStore.getState().strategies;
    await useStrategyStore.getState().updateStrategy(strategy.id!, { name: "Breakout", description: "Updated" });
    expect(useStrategyStore.getState().strategies[0].description).toBe("Updated");

    await useStrategyStore.getState().deleteStrategy(strategy.id!);
    expect(useStrategyStore.getState().strategies).toHaveLength(0);
  });

  it("sets an error and stops loading when loadStrategies fails", async () => {
    vi.spyOn(strategyService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useStrategyStore.getState().loadStrategies();

    expect(useStrategyStore.getState().loading).toBe(false);
    expect(useStrategyStore.getState().error).toBe("DB unavailable");
  });

  it("addStrategy rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(strategyService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(useStrategyStore.getState().addStrategy({ name: "Breakout" })).rejects.toThrow("Write failed");

    expect(useStrategyStore.getState().error).toBeNull();
  });
});
