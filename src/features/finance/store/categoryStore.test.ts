import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCategoryStore } from "./categoryStore";
import { categoryService } from "../services/categoryService";

describe("categoryStore error handling", () => {
  beforeEach(() => {
    useCategoryStore.setState({ categories: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("sets an error and stops loading when loadCategories fails", async () => {
    vi.spyOn(categoryService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useCategoryStore.getState().loadCategories();

    expect(useCategoryStore.getState().loading).toBe(false);
    expect(useCategoryStore.getState().error).toBe("DB unavailable");
  });

  it("addCategory rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(categoryService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useCategoryStore.getState().addCategory({
        name: "Food",
        type: "expense",
        icon: "utensils",
        color: "#ef4444",
      })
    ).rejects.toThrow("Write failed");

    expect(useCategoryStore.getState().error).toBeNull();
  });
});
