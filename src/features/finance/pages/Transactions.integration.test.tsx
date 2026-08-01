import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Transactions from "./Transactions";
import TransactionDrawer from "@/features/finance/components/TransactionDrawer";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { transactionService } from "@/features/finance/services/transactionService";
import { recognizeSlipText, recognizeSlipTextBatch } from "@/features/finance/utils/slipOcr";

vi.mock("@/features/finance/utils/slipOcr", () => ({
  recognizeSlipText: vi.fn(),
  recognizeSlipTextBatch: vi.fn(),
}));

function renderTransactionsPage() {
  return render(
    <>
      <Transactions />
      <TransactionDrawer />
    </>
  );
}

async function seedAccountsAndCategories() {
  await db.accounts.bulkAdd([
    { name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" },
    { name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" },
  ]);

  await db.categories.bulkAdd([
    { name: "Food", type: "expense", icon: "utensils", color: "#ef4444" },
  ]);
}

describe("Transactions page (add / edit / delete flow)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();

    await db.transactions.clear();
    await db.accounts.clear();
    await db.categories.clear();

    useTransactionStore.setState({ transactions: [], loading: false });
    useAccountStore.setState({ accounts: [] });
    useCategoryStore.setState({ categories: [] });
    useUIStore.setState({ isTransactionDrawerOpen: false, selectedTransaction: null, draftTransaction: null });

    await seedAccountsAndCategories();
  });

  it("adds a new transaction and shows it in the table", async () => {
    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await user.type(await screen.findByLabelText("Item name"), "Coffee");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "120");
    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.selectOptions(screen.getByLabelText("Account"), "Cash");

    await user.click(screen.getByRole("button", { name: "Save" }));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Coffee")).toBeInTheDocument();
    expect(within(table).getByText("฿120")).toBeInTheDocument();

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Coffee");
  });

  it("edits an existing transaction in place instead of duplicating it", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    const row = within(table).getByText("Coffee").closest("tr")!;
    const editButton = within(row).getByRole("button", { name: /edit/i });
    await user.click(editButton);

    const amountInput = await screen.findByLabelText("Amount");
    expect(amountInput).toHaveValue(120);

    await user.clear(amountInput);
    await user.type(amountInput, "200");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await within(table).findByText("฿200")).toBeInTheDocument();

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].amount).toBe(200);
  });

  it("deletes a transaction from the table", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    const row = within(table).getByText("Coffee").closest("tr")!;
    const deleteButton = within(row).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
    });
    expect(await db.transactions.toArray()).toHaveLength(0);
  });

  it("shows a submit error and keeps the drawer open when saving fails", async () => {
    vi.spyOn(transactionService, "create").mockRejectedValueOnce(new Error("Write failed"));

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await user.type(await screen.findByLabelText("Item name"), "Coffee");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "120");
    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.selectOptions(screen.getByLabelText("Account"), "Cash");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Write failed")).toBeInTheDocument();

    // The drawer stays open with the entered data intact, not silently discarded.
    expect(screen.getByLabelText("Item name")).toHaveValue("Coffee");
    expect(await db.transactions.toArray()).toHaveLength(0);
  });

  it("does not reset the open form when a background store refresh briefly flips loading, once data is already present", async () => {
    // Simulates what a periodic cross-device sync pass does: it reloads
    // every store, including accounts/categories, flipping their `loading`
    // flag true then false even while this form is open. Since accounts and
    // categories already have data by this point, the form must not be
    // replaced with a spinner (which would unmount it and wipe out whatever
    // the user was mid-typing).
    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.type(await screen.findByLabelText("Item name"), "Coffee");

    useAccountStore.setState({ loading: true });
    useCategoryStore.setState({ loading: true });

    // Force React to actually process this intermediate render before
    // flipping loading back off — otherwise a synchronous true-then-false
    // flip could get batched away without ever really testing anything.
    await waitFor(() => {
      expect(screen.getByLabelText("Item name")).toHaveValue("Coffee");
    });

    useAccountStore.setState({ loading: false });
    useCategoryStore.setState({ loading: false });

    expect(screen.getByLabelText("Item name")).toHaveValue("Coffee");
  });

  it("creates a transfer between two accounts without requiring a category", async () => {
    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await user.selectOptions(await screen.findByLabelText("Type"), "transfer");
    await user.type(screen.getByLabelText("Item name"), "Move to bank");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "500");
    await user.selectOptions(screen.getByLabelText("From Account"), "Cash");
    await user.selectOptions(screen.getByLabelText("To Account"), "Bank");

    await user.click(screen.getByRole("button", { name: "Save" }));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Move to bank")).toBeInTheDocument();
    expect(within(table).getByText("→ Bank")).toBeInTheDocument();

    const stored = await db.transactions.toArray();
    expect(stored[0].type).toBe("transfer");
    expect(stored[0].category).toBeFalsy();
  });

  it("filters the table by category and by account", async () => {
    await db.transactions.bulkAdd([
      { title: "Coffee", amount: 120, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Paycheck", amount: 30000, type: "income", category: "Salary", account: "Bank", date: "2026-07-01", status: "completed" },
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Coffee")).toBeInTheDocument();
    expect(within(table).getByText("Paycheck")).toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue("All Categories"), "Food");
    expect(within(table).getByText("Coffee")).toBeInTheDocument();
    expect(within(table).queryByText("Paycheck")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue("Food"), "all");
    await user.selectOptions(screen.getByDisplayValue("All Accounts"), "Bank");
    expect(within(table).getByText("Paycheck")).toBeInTheDocument();
    expect(within(table).queryByText("Coffee")).not.toBeInTheDocument();
  });

  it("filters the table by a date range", async () => {
    await db.transactions.bulkAdd([
      { title: "Old rent", amount: 8000, type: "expense", category: "Food", account: "Cash", date: "2026-07-01", status: "completed" },
      { title: "Coffee", amount: 120, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Old rent")).toBeInTheDocument();
    expect(within(table).getByText("Coffee")).toBeInTheDocument();

    await user.type(screen.getByLabelText("From"), "2026-07-10");
    expect(within(table).queryByText("Old rent")).not.toBeInTheDocument();
    expect(within(table).getByText("Coffee")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("From"));
    await user.type(screen.getByLabelText("To"), "2026-07-05");
    expect(within(table).getByText("Old rent")).toBeInTheDocument();
    expect(within(table).queryByText("Coffee")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(within(table).getByText("Old rent")).toBeInTheDocument();
    expect(within(table).getByText("Coffee")).toBeInTheDocument();
  });

  it("defaults to insertion order (most recently added first), and switches to date sort on header click", async () => {
    await db.transactions.bulkAdd([
      { title: "Old rent", amount: 8000, type: "expense", category: "Food", account: "Cash", date: "2026-07-01", status: "completed" },
      { title: "New coffee", amount: 120, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    const titleCells = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    // Default: most-recently-added row first ("New coffee" was inserted
    // second, so it has the higher `id`) — no column header is "active" yet.
    expect(titleCells()).toEqual(["New coffee", "Old rent"]);

    // Clicking "Date" switches to an explicit date-ascending sort.
    await user.click(within(table).getByRole("button", { name: /^Date/i }));
    expect(titleCells()).toEqual(["Old rent", "New coffee"]);
  });

  it("orders by insertion (id), not by date, when a later-dated row was added first", async () => {
    await db.transactions.bulkAdd([
      // Added first (lower id) despite having the later date.
      { title: "Backfilled July trip", amount: 3000, type: "expense", category: "Food", account: "Cash", date: "2026-07-20", status: "completed" },
      // Added second (higher id) despite having the earlier date.
      { title: "Just logged", amount: 50, type: "expense", category: "Food", account: "Cash", date: "2026-01-01", status: "completed" },
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    const titleCells = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    // Insertion order (highest id first), not date order.
    expect(titleCells()).toEqual(["Just logged", "Backfilled July trip"]);

    await user.click(within(table).getByRole("button", { name: /^Date/i }));
    expect(titleCells()).toEqual(["Just logged", "Backfilled July trip"]); // ascending by date

    await user.click(within(table).getByRole("button", { name: /^Date/i }));
    expect(titleCells()).toEqual(["Backfilled July trip", "Just logged"]); // descending by date
  });

  it("sorts the table by amount when the Amount header is clicked", async () => {
    await db.transactions.bulkAdd([
      { title: "Big", amount: 500, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
      { title: "Small", amount: 50, type: "expense", category: "Food", account: "Cash", date: "2026-07-21", status: "completed" },
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    const table = await screen.findByRole("table");
    const titleCells = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    await user.click(within(table).getByRole("button", { name: /^Amount/i }));
    expect(titleCells()).toEqual(["Small", "Big"]);

    await user.click(within(table).getByRole("button", { name: /^Amount/i }));
    expect(titleCells()).toEqual(["Big", "Small"]);
  });

  it("offers both a camera capture option and a gallery picker for the slip scanner", async () => {
    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: "Scan Slip" }));

    expect(screen.getByLabelText(/Take Photo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose from Gallery/)).toBeInTheDocument();
  });

  it("scans a slip and opens the transaction drawer pre-filled for review", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock") });
    vi.mocked(recognizeSlipText).mockResolvedValueOnce(
      "22/07/2569\nโอนไปยัง ร้านกาแฟ\nจำนวนเงิน 150.00 บาท"
    );

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: "Scan Slip" }));
    const fileInput = screen.getByLabelText(/Choose from Gallery/);
    const file = new File(["dummy"], "slip.png", { type: "image/png" });
    await user.upload(fileInput, file);

    const amountInput = await screen.findByLabelText("Amount");
    expect(amountInput).toHaveValue(150);
    expect(screen.getByLabelText("Item name")).toHaveValue("โอนเงินให้ ร้านกาแฟ");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-22");

    vi.unstubAllGlobals();
  });

  it("shows an error and lets the user retry when the slip can't be read", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock") });
    vi.mocked(recognizeSlipText).mockResolvedValueOnce("unreadable garbled text ###");

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: "Scan Slip" }));
    const fileInput = screen.getByLabelText(/Choose from Gallery/);
    const file = new File(["dummy"], "slip.png", { type: "image/png" });
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Couldn't read the slip/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("scans multiple slips at once and lets the user review and save them all", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock") });
    vi.mocked(recognizeSlipTextBatch).mockResolvedValueOnce([
      "22/07/2569\nโอนไปยัง ร้านกาแฟ\nจำนวนเงิน 150.00 บาท",
      "23/07/2569\nโอนไปยัง ร้านอาหาร\nจำนวนเงิน 80.00 บาท",
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: "Scan Slip" }));
    const fileInput = screen.getByLabelText(/Choose from Gallery/);
    const files = [
      new File(["dummy1"], "slip1.png", { type: "image/png" }),
      new File(["dummy2"], "slip2.png", { type: "image/png" }),
    ];
    await user.upload(fileInput, files);

    expect(await screen.findByText("Found 2 items — review before saving")).toBeInTheDocument();
    expect(screen.getByDisplayValue("โอนเงินให้ ร้านกาแฟ")).toBeInTheDocument();
    expect(screen.getByDisplayValue("โอนเงินให้ ร้านอาหาร")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150")).toBeInTheDocument();
    expect(screen.getByDisplayValue("80")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Save All/ }));

    await waitFor(async () => {
      expect(await db.transactions.count()).toBe(2);
    });

    const stored = await db.transactions.toArray();
    expect(stored.map((t) => t.title).sort()).toEqual(["โอนเงินให้ ร้านกาแฟ", "โอนเงินให้ ร้านอาหาร"]);
    expect(stored.map((t) => t.amount).sort((a, b) => a - b)).toEqual([80, 150]);

    vi.unstubAllGlobals();
  });

  it("lets the user remove a bad item from a batch scan before saving", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock") });
    vi.mocked(recognizeSlipTextBatch).mockResolvedValueOnce([
      "22/07/2569\nโอนไปยัง ร้านกาแฟ\nจำนวนเงิน 150.00 บาท",
      "unreadable garbled text ###",
    ]);

    const user = userEvent.setup();
    renderTransactionsPage();

    await user.click(screen.getByRole("button", { name: "Scan Slip" }));
    const fileInput = screen.getByLabelText(/Choose from Gallery/);
    const files = [
      new File(["dummy1"], "slip1.png", { type: "image/png" }),
      new File(["dummy2"], "slip2.png", { type: "image/png" }),
    ];
    await user.upload(fileInput, files);

    expect(await screen.findByText("Found 2 items — review before saving")).toBeInTheDocument();
    expect(screen.getByText("Couldn't read this one — please enter it manually")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove slip2.png" }));
    await user.click(screen.getByRole("button", { name: /Save All/ }));

    await waitFor(async () => {
      expect(await db.transactions.count()).toBe(1);
    });

    const stored = await db.transactions.toArray();
    expect(stored[0].title).toBe("โอนเงินให้ ร้านกาแฟ");

    vi.unstubAllGlobals();
  });
});
