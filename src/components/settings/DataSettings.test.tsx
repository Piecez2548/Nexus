import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockIsNativePlatform = vi.fn();
const mockWriteFile = vi.fn();
const mockShare = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: (...args: unknown[]) => mockWriteFile(...args) },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));

vi.mock("@capacitor/share", () => ({
  Share: { share: (...args: unknown[]) => mockShare(...args) },
}));

import DataSettings from "./DataSettings";
import { db } from "@/database/db";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";

describe("DataSettings", () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.categories.clear();
    await db.transactions.clear();
    useAccountStore.setState({ accounts: [], loading: false, error: null });
    useCategoryStore.setState({ categories: [], loading: false, error: null });
    useTransactionStore.setState({ transactions: [], loading: false, error: null });
    mockIsNativePlatform.mockReset().mockReturnValue(false);
    mockWriteFile.mockReset().mockResolvedValue({ uri: "file:///cache/nexus-backup.json" });
    mockShare.mockReset().mockResolvedValue(undefined);
  });

  it("merges duplicate accounts and categories and reports how many were merged", async () => {
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
      { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
    ]);
    await db.categories.bulkAdd([
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /merge duplicates/i }));

    expect(await screen.findByText(/Merged 1 duplicate accounts and 1 duplicate categories/)).toBeInTheDocument();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.categories.count()).toBe(1);
  });

  it("reports when there's nothing to merge", async () => {
    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /merge duplicates/i }));

    expect(await screen.findByText("No duplicates found")).toBeInTheDocument();
  });

  it("finds duplicate transactions, previews them, and merges on confirm", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Unrelated", amount: 50, type: "expense", category: "Food", account: "Cash", date: "2026-07-22", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));

    expect(await screen.findByText("Found 1 duplicate group(s)")).toBeInTheDocument();
    expect(screen.getByText("Kept (oldest)")).toBeInTheDocument();
    expect(screen.getByText("1 duplicate(s) will be removed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Merge 1 selected" }));

    expect(await screen.findByText("Removed 1 duplicate transactions")).toBeInTheDocument();
    expect(await db.transactions.count()).toBe(2);
    const titles = (await db.transactions.toArray()).map((t) => t.title).sort();
    expect(titles).toEqual(["Lunch", "Unrelated"]);
  });

  // Regression (BUG-10): the merge previously acted on every detected group
  // at once with no way to exclude one. The matching key requires every
  // field to match exactly, but that's still not proof two transactions are
  // really the same event -- e.g. two separately-bought ฿35 coffees on the
  // same day with no `time` set. A false-positive group used to have no way
  // to be kept out of the deletion short of cancelling the whole review.
  it("excludes a deselected group from the merge, leaving its transactions untouched", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Coffee", amount: 35, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Coffee", amount: 35, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(4));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));
    expect(await screen.findByText("Found 2 duplicate group(s)")).toBeInTheDocument();
    // Every group starts selected -- unchanged behavior for a user who
    // doesn't touch anything.
    expect(screen.getByRole("button", { name: "Merge 2 selected" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Coffee/ }));
    await user.click(await screen.findByRole("button", { name: "Merge 1 selected" }));

    expect(await screen.findByText("Removed 1 duplicate transactions")).toBeInTheDocument();
    const remaining = await db.transactions.toArray();
    expect(remaining.filter((t) => t.title === "Coffee")).toHaveLength(2); // untouched
    expect(remaining.filter((t) => t.title === "Lunch")).toHaveLength(1); // merged
  });

  it("disables the merge button once every group has been deselected", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));
    expect(await screen.findByText("Found 1 duplicate group(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Lunch/ }));

    expect(await screen.findByRole("button", { name: "Merge 0 selected" })).toBeDisabled();
    expect(await db.transactions.count()).toBe(2);
  });

  it("does not open the preview and reports nothing found when there are no duplicate transactions", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Dinner", amount: 200, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));

    expect(await screen.findByText("No duplicate transactions found")).toBeInTheDocument();
    expect(screen.queryByText(/Found \d+ duplicate group/)).not.toBeInTheDocument();
    expect(await db.transactions.count()).toBe(2);
  });

  it("cancels the preview without deleting anything", async () => {
    await db.transactions.bulkAdd([
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Lunch", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    render(<DataSettings />);
    await waitFor(() => expect(useTransactionStore.getState().transactions).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /^Merge Duplicate Transactions/ }));
    expect(await screen.findByText("Found 1 duplicate group(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Found 1 duplicate group(s)")).not.toBeInTheDocument());
    expect(await db.transactions.count()).toBe(2);
  });

  it("exports via the OS share sheet on native, instead of a blob-URL download link that silently does nothing there", async () => {
    mockIsNativePlatform.mockReturnValue(true);

    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /^Export Backup/ }));

    await waitFor(() => expect(mockWriteFile).toHaveBeenCalled());
    const [writeArgs] = mockWriteFile.mock.calls[0]!;
    expect(writeArgs).toMatchObject({ directory: "CACHE", encoding: "utf8" });
    expect(writeArgs.path).toMatch(/^nexus-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(typeof writeArgs.data).toBe("string");
    JSON.parse(writeArgs.data); // the written payload is the real backup JSON, not a stub

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ url: "file:///cache/nexus-backup.json" }),
    );
    expect(await screen.findByText("Backup file downloaded")).toBeInTheDocument();
  });

  it("exports via a blob-URL download link on web, never touching Filesystem/Share", async () => {
    mockIsNativePlatform.mockReturnValue(false);

    const user = userEvent.setup();
    render(<DataSettings />);

    await user.click(screen.getByRole("button", { name: /^Export Backup/ }));

    expect(await screen.findByText("Backup file downloaded")).toBeInTheDocument();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockShare).not.toHaveBeenCalled();
  });
});
