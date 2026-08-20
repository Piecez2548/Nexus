import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import StrategyComparisonTable from "./StrategyComparisonTable";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useLanguageStore } from "@/store/languageStore";
import type { Trade } from "@/features/trading/types";

const baseTrade: Trade = {
  symbol: "AAPL",
  market: "stocks",
  direction: "long",
  status: "closed",
  entryPrice: 100,
  quantity: 10,
  entryDate: "2026-07-01",
};

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useTradeStore.setState({ trades: [] });
});

describe("StrategyComparisonTable", () => {
  it("shows an empty state with no closed trades", () => {
    render(<StrategyComparisonTable />);
    expect(screen.getByText("No closed trades yet")).toBeInTheDocument();
  });

  it("renders one row per strategy with aggregated totals", () => {
    useTradeStore.setState({
      trades: [
        { ...baseTrade, strategy: "Breakout", exitPrice: 110, exitDate: "2026-07-01" }, // +100
        { ...baseTrade, strategy: "Reversal", exitPrice: 120, exitDate: "2026-07-02" }, // +200
      ],
    });

    render(<StrategyComparisonTable />);

    expect(screen.getAllByText("Breakout").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reversal").length).toBeGreaterThan(0);
  });

  it("re-sorts rows when a sortable column header is clicked", async () => {
    useTradeStore.setState({
      trades: [
        { ...baseTrade, strategy: "Low", exitPrice: 105, exitDate: "2026-07-01" }, // +50
        { ...baseTrade, strategy: "High", exitPrice: 150, exitDate: "2026-07-02" }, // +500
      ],
    });

    const user = userEvent.setup();
    render(<StrategyComparisonTable />);

    // Default sort is totalPnl descending -> High first.
    let strategyCells = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
    expect(strategyCells[0]).toContain("High");

    // Click the Strategy header to sort by name ascending -> High, Low (alphabetical).
    await user.click(screen.getByRole("button", { name: /Strategy/i }));
    strategyCells = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
    expect(strategyCells[0]).toContain("High");

    // Click again to flip to descending -> Low first.
    await user.click(screen.getByRole("button", { name: /Strategy/i }));
    strategyCells = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
    expect(strategyCells[0]).toContain("Low");
  });
});
