import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Portfolio from "./Portfolio";
import { db } from "@/database/db";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";

describe("Portfolio page", () => {
  beforeEach(async () => {
    await db.holdings.clear();
    useHoldingStore.setState({ holdings: [], loading: false, error: null });
  });

  it("creates a new holding and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<Portfolio />);

    await user.click(screen.getByRole("button", { name: /add holding/i }));
    await user.type(await screen.findByLabelText("Symbol"), "AAPL");
    await user.type(screen.getByLabelText("Quantity"), "10");
    await user.type(screen.getByLabelText("Average Cost Price"), "100");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { name: "AAPL" })).toBeInTheDocument();
    // "Stocks" also appears as a <select> option while the drawer is mid
    // close-animation — wait for it to settle to a single match.
    await waitFor(() => expect(screen.getAllByText("Stocks")).toHaveLength(1));
  });

  it("shows a 'no price yet' state before any price is entered, then reflects the P/L once one is set", async () => {
    await db.holdings.add({
      symbol: "AAPL",
      market: "stocks",
      quantity: 10,
      avgCostPrice: 100,
      createdAt: new Date().toISOString(),
    } as never);

    const user = userEvent.setup();
    render(<Portfolio />);

    await screen.findByRole("heading", { name: "AAPL" });
    expect(screen.getByText("Enter a current price to see P/L")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Update current price for AAPL"), "120");
    await user.click(screen.getByRole("button", { name: "Save price for AAPL" }));

    await waitFor(() => {
      // Appears twice: once in the summary grid's total (a single holding
      // makes the portfolio total equal the holding's own P/L) and once on
      // the holding card itself.
      expect(screen.getAllByText("+200 (+20%)").length).toBeGreaterThan(0);
    });
  });

  it("deletes a holding", async () => {
    await db.holdings.add({
      symbol: "MSFT",
      market: "stocks",
      quantity: 5,
      avgCostPrice: 300,
      createdAt: new Date().toISOString(),
    } as never);

    const user = userEvent.setup();
    render(<Portfolio />);

    await user.click(await screen.findByRole("button", { name: "Delete MSFT" }));

    await waitFor(() => {
      expect(screen.getByText("No holdings yet — press the Add Holding button to start")).toBeInTheDocument();
    });
  });
});
