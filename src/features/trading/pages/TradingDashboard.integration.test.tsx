import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TradingDashboard from "./TradingDashboard";
import { db } from "@/database/db";
import { useTradeStore } from "@/features/trading/store/tradeStore";

describe("TradingDashboard (real data flow)", () => {
  beforeEach(async () => {
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
  });

  it("shows zeroed stats with no trades", async () => {
    render(<TradingDashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Trading Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/trading");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("href", "/trading/journal");
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute("href", "/trading#analytics");
    expect(screen.getByText("0.0%")).toBeInTheDocument(); // win rate
    expect(screen.getAllByText("0").length).toBeGreaterThan(0); // open positions, etc.
  });

  it("reflects closed-trade stats and lists recent trades", async () => {
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
        direction: "long",
        status: "open",
        entryPrice: 300,
        quantity: 5,
        entryDate: "2026-07-21",
      },
    ]);

    render(<TradingDashboard />, { wrapper: MemoryRouter });

    // Two tables render now that StrategyComparisonTable also renders one --
    // find the recent-trades table specifically (the one listing symbols).
    const tables = await screen.findAllByRole("table");
    const table = tables.find((t) => within(t).queryByText("AAPL"))!;
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).getByText("MSFT")).toBeInTheDocument();
    // "100.0%" appears both as the overall win rate and (with a single closed
    // trade) the Breakout group's win rate in StrategyComparisonTable.
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);

    // "Breakout" appears both in the recent-trades row and the best-strategy card.
    expect(screen.getAllByText("Breakout").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("2 trades · +200 total P/L")).toBeInTheDocument();
  });

  it("shows empty states for the analytics section with no closed trades", async () => {
    render(<TradingDashboard />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Equity Curve")).toBeInTheDocument();
    expect(screen.getByText("Drawdown")).toBeInTheDocument();
    expect(screen.getByText("No Session data yet")).toBeInTheDocument();
    expect(screen.getByText("Performance Calendar")).toBeInTheDocument();
  });

  it("populates the analytics section from closed trades with session and stop-loss data", async () => {
    await db.trades.bulkAdd([
      {
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 100,
        exitPrice: 120,
        stopLoss: 90,
        quantity: 10,
        session: "london",
        entryDate: "2026-07-20",
        exitDate: "2026-07-20",
      },
      {
        symbol: "MSFT",
        market: "stocks",
        direction: "long",
        status: "closed",
        entryPrice: 300,
        exitPrice: 280,
        stopLoss: 310,
        quantity: 5,
        session: "asian",
        entryDate: "2026-07-21",
        exitDate: "2026-07-21",
      },
    ]);

    render(<TradingDashboard />, { wrapper: MemoryRouter });

    // Recharts' ResponsiveContainer needs real layout dimensions to render
    // its SVG (axis ticks, etc.), which jsdom doesn't provide — so the
    // charts themselves aren't asserted on here, only the plain-HTML
    // session panel that reads from the same hook.
    expect(await screen.findByText("London")).toBeInTheDocument();
    expect(screen.getByText("Asian")).toBeInTheDocument();
  });
});
