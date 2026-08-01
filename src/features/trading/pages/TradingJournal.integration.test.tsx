import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TradingJournal from "./TradingJournal";
import TradeDrawer from "@/features/trading/components/TradeDrawer";
import { db } from "@/database/db";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { tradeService } from "@/features/trading/services/tradeService";
import type { Trade } from "@/features/trading/types";

function renderJournalPage() {
  return render(
    <>
      <TradingJournal />
      <TradeDrawer />
    </>
  );
}

describe("TradingJournal page (add / edit / delete flow)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
    useTradingUIStore.setState({ isTradeDrawerOpen: false, selectedTrade: null });
  });

  it("adds a new open trade and shows it in the table", async () => {
    const user = userEvent.setup();
    renderJournalPage();

    await user.click(screen.getByRole("button", { name: /add trade/i }));

    await user.type(await screen.findByLabelText("Symbol"), "AAPL");
    const entryPriceInput = screen.getByLabelText("Entry Price");
    await user.clear(entryPriceInput);
    await user.type(entryPriceInput, "150");
    const quantityInput = screen.getByLabelText("Lot Size");
    await user.clear(quantityInput);
    await user.type(quantityInput, "10");

    await user.click(screen.getByRole("button", { name: "Save" }));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    const stored = await db.trades.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe("open");
  });

  it("edits a trade in place, closing it and computing P/L", async () => {
    await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 100,
      quantity: 10,
      entryDate: "2026-07-21",
    });

    const user = userEvent.setup();
    renderJournalPage();

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Edit AAPL" }));

    // Status is derived from the exit price — no manual status field anymore.
    const exitPriceInput = await screen.findByLabelText("Exit Price");
    await user.type(exitPriceInput, "120");
    const exitDateInput = screen.getByLabelText("Exit Date");
    await user.type(exitDateInput, "2026-07-22");

    await user.click(screen.getByRole("button", { name: "Save" }));

    // (120 - 100) * 10 = 200 profit
    expect(await within(table).findByText("200")).toBeInTheDocument();

    const stored = await db.trades.toArray();
    expect(stored[0].status).toBe("closed");
    expect(stored[0].exitPrice).toBe(120);
  });

  it("deletes a trade from the table", async () => {
    await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 100,
      quantity: 10,
      entryDate: "2026-07-21",
    });

    const user = userEvent.setup();
    renderJournalPage();

    const table = await screen.findByRole("table");
    await user.click(within(table).getByRole("button", { name: "Delete AAPL" }));

    await waitFor(() => {
      expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
    });
  });

  it("shows a submit error and keeps the drawer open when saving fails", async () => {
    vi.spyOn(tradeService, "create").mockRejectedValueOnce(new Error("Write failed"));

    const user = userEvent.setup();
    renderJournalPage();

    await user.click(screen.getByRole("button", { name: /add trade/i }));

    await user.type(await screen.findByLabelText("Symbol"), "AAPL");
    const entryPriceInput = screen.getByLabelText("Entry Price");
    await user.clear(entryPriceInput);
    await user.type(entryPriceInput, "150");
    const quantityInput = screen.getByLabelText("Lot Size");
    await user.clear(quantityInput);
    await user.type(quantityInput, "10");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Write failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Symbol")).toHaveValue("AAPL");
    expect(await db.trades.toArray()).toHaveLength(0);
  });

  it("filters the table by search text, direction, and result", async () => {
    await db.trades.bulkAdd([
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 120,
        quantity: 10,
        strategy: "Breakout",
        entryDate: "2026-07-20",
        exitDate: "2026-07-20",
      },
      {
        symbol: "MSFT",
        market: "stocks",
        direction: "short",
        status: "closed",
        entryPrice: 300,
        exitPrice: 320,
        quantity: 5,
        strategy: "Reversal",
        entryDate: "2026-07-21",
        exitDate: "2026-07-21",
      },
    ]);

    const user = userEvent.setup();
    renderJournalPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).getByText("MSFT")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search symbol or strategy..."), "AAPL");
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).queryByText("MSFT")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search symbol or strategy..."));
    await user.selectOptions(screen.getByDisplayValue("All Directions"), "short");
    expect(within(table).getByText("MSFT")).toBeInTheDocument();
    expect(within(table).queryByText("AAPL")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue("Short"), "all");
    // MSFT lost 20 on a short, so it's the only "Loss" result.
    await user.selectOptions(screen.getByDisplayValue("All Results"), "loss");
    expect(within(table).getByText("MSFT")).toBeInTheDocument();
    expect(within(table).queryByText("AAPL")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).getByText("MSFT")).toBeInTheDocument();
  });

  it("sorts the table when a column header is clicked", async () => {
    await db.trades.bulkAdd([
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 120,
        quantity: 10,
        entryDate: "2026-07-20",
        exitDate: "2026-07-20",
      },
      {
        symbol: "MSFT",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 300,
        exitPrice: 320,
        quantity: 5,
        entryDate: "2026-07-22",
        exitDate: "2026-07-22",
      },
    ]);

    renderJournalPage();
    const table = await screen.findByRole("table");
    within(table).getByText("AAPL");

    const symbolCells = () => within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[1].textContent);

    // Default sort is by date descending, so the later trade (MSFT) comes first.
    expect(symbolCells()).toEqual(["MSFT", "AAPL"]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Date/i }));
    expect(symbolCells()).toEqual(["AAPL", "MSFT"]);
  });

  it("paginates when there are more than 10 trades", async () => {
    const trades: Trade[] = Array.from({ length: 12 }, (_, i) => ({
      symbol: `SYM${i}`,
      market: "stocks",
      direction: "long",
      status: "open" as const,
      entryPrice: 100,
      quantity: 1,
      entryDate: `2026-07-${String(i + 1).padStart(2, "0")}`,
    }));
    await db.trades.bulkAdd(trades);

    renderJournalPage();

    const pageIndicator = await screen.findByText("Page 1 of 2 · 12 trades");
    const desktop = pageIndicator.closest("div.hidden") as HTMLElement;
    expect(screen.getAllByRole("row")).toHaveLength(11); // header + 10 rows

    const user = userEvent.setup();
    await user.click(within(desktop).getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Page 2 of 2 · 12 trades")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 remaining rows
  });

  it("exports the filtered trades as CSV", async () => {
    await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "closed",
      entryPrice: 100,
      exitPrice: 120,
      quantity: 10,
      entryDate: "2026-07-20",
      exitDate: "2026-07-20",
    });

    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderJournalPage();
    const table = await screen.findByRole("table");
    within(table).getByText("AAPL");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
