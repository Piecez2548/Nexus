import { describe, expect, it, vi, beforeEach } from "vitest";
import { useTransactionStore } from "./transactionStore";
import { transactionService } from "../services/transactionService";
import { useGamificationStore } from "@/store/gamificationStore";
import { db } from "@/database/db";

describe("transactionStore error handling", () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("sets an error and stops loading when loadTransactions fails", async () => {
    vi.spyOn(transactionService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useTransactionStore.getState().loadTransactions();

    expect(useTransactionStore.getState().loading).toBe(false);
    expect(useTransactionStore.getState().error).toBe("DB unavailable");
  });

  it("clears the error once a retry succeeds", async () => {
    vi.spyOn(transactionService, "list")
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValueOnce([]);

    await useTransactionStore.getState().loadTransactions();
    expect(useTransactionStore.getState().error).toBe("DB unavailable");

    await useTransactionStore.getState().loadTransactions();
    expect(useTransactionStore.getState().error).toBeNull();
  });

  it("addTransaction rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(transactionService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useTransactionStore.getState().addTransaction({
        title: "Coffee",
        amount: 100,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      })
    ).rejects.toThrow("Write failed");

    // Mutation errors are the calling component's responsibility to display
    // (e.g. inline on the form) — they must not surface as a page-level
    // "failed to load the list" error too.
    expect(useTransactionStore.getState().error).toBeNull();
  });
});

describe("transactionStore gamification", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useTransactionStore.setState({ transactions: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("awards xp when a transaction is logged", async () => {
    await useTransactionStore.getState().addTransaction({
      title: "Coffee",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    expect(useGamificationStore.getState().xp).toBe(5);
  });
});
