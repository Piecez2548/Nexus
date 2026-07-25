import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAccountStore } from "./accountStore";
import { accountService } from "../services/accountService";

describe("accountStore error handling", () => {
  beforeEach(() => {
    useAccountStore.setState({ accounts: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("sets an error and stops loading when loadAccounts fails", async () => {
    vi.spyOn(accountService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useAccountStore.getState().loadAccounts();

    expect(useAccountStore.getState().loading).toBe(false);
    expect(useAccountStore.getState().error).toBe("DB unavailable");
  });

  it("addAccount rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(accountService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useAccountStore.getState().addAccount({
        name: "Cash",
        type: "cash",
        icon: "wallet",
        color: "#3b82f6",
      })
    ).rejects.toThrow("Write failed");

    expect(useAccountStore.getState().error).toBeNull();
  });
});
