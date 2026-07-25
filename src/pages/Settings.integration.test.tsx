import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Settings from "./Settings";
import { db } from "@/database/db";
import { useAppSettingsStore } from "@/store/appSettingsStore";

function renderSettings() {
  return render(<Settings />, { wrapper: MemoryRouter });
}

describe("Settings page", () => {
  beforeEach(async () => {
    await Promise.all([
      db.transactions.clear(),
      db.accounts.clear(),
      db.categories.clear(),
    ]);

    useAppSettingsStore.setState({
      themeMode: "dark",
      currency: "THB",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "1,234.56",
    });
  });

  it("switches theme mode when a theme option is clicked", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(useAppSettingsStore.getState().themeMode).toBe("light");

    await user.click(screen.getByRole("button", { name: "System" }));
    expect(useAppSettingsStore.getState().themeMode).toBe("system");
  });

  it("updates currency, date format, and number format preferences", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.selectOptions(screen.getByLabelText("สกุลเงิน (Currency)"), "USD");
    await user.selectOptions(screen.getByLabelText("รูปแบบวันที่ (Date Format)"), "YYYY-MM-DD");
    await user.selectOptions(screen.getByLabelText("รูปแบบตัวเลข (Number Format)"), "1.234,56");

    const state = useAppSettingsStore.getState();
    expect(state.currency).toBe("USD");
    expect(state.dateFormat).toBe("YYYY-MM-DD");
    expect(state.numberFormat).toBe("1.234,56");
  });

  it("resets all data after confirmation and re-seeds defaults", async () => {
    await db.transactions.add({
      title: "Custom",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /reset all data/i }));

    await waitFor(async () => {
      expect(await db.transactions.count()).toBe(0);
    });

    const accounts = await db.accounts.toArray();
    expect(accounts.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it("does not reset data when the confirmation is dismissed", async () => {
    await db.transactions.add({
      title: "Keep me",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /reset all data/i }));

    expect(await db.transactions.count()).toBe(1);

    vi.restoreAllMocks();
  });

  it("enables transaction CSV export once transactions exist", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 58,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/Export all 1 transactions/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /^CSV/i })).toBeEnabled();
  });

  it("imports valid rows from a selected CSV file in the Transactions Import/Export section", async () => {
    const user = userEvent.setup();
    renderSettings();

    const csv = [
      "date,title,type,category,account,toAccount,amount,status,tags,note,recipient",
      "2026-07-21,Coffee,expense,Food,Cash,,58,completed,,,",
    ].join("\n");

    const file = new File([csv], "transactions.csv", { type: "text/csv" });
    const input = await screen.findByLabelText("Import transactions CSV file");

    await user.upload(input, file);

    expect(await screen.findByText(/Found 1 valid rows/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Import 1 rows/ }));

    expect(await screen.findByText("Successfully imported 1 rows")).toBeInTheDocument();

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Coffee");
  });
});
