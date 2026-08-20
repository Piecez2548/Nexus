import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import TradeReplayView from "./TradeReplayView";
import { useLanguageStore } from "@/store/languageStore";
import type { Trade } from "@/features/trading/types";

const baseTrade: Trade = {
  symbol: "AAPL",
  market: "stocks",
  direction: "long",
  status: "open",
  entryPrice: 100,
  quantity: 10,
  entryDate: "2026-07-01",
};

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("TradeReplayView", () => {
  it("renders the Entry and Position sections for an open trade with minimal data", () => {
    render(<TradeReplayView trade={baseTrade} />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Entry" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Position" })).toBeInTheDocument();
  });

  it("shows 'still open' in the Exit section for an open trade", () => {
    render(<TradeReplayView trade={baseTrade} />);
    expect(screen.getByText("This trade is still open.")).toBeInTheDocument();
  });

  it("shows exit price, P/L, and result for a closed trade", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      exitDate: "2026-07-02",
    };

    render(<TradeReplayView trade={trade} />);

    expect(screen.queryByText("This trade is still open.")).not.toBeInTheDocument();
    expect(screen.getByText("110")).toBeInTheDocument(); // exit price
    expect(screen.getByText("Win")).toBeInTheDocument(); // result badge
  });

  it("shows the no-reflection placeholder when no reflection fields are set", () => {
    render(<TradeReplayView trade={baseTrade} />);
    expect(screen.getByText("No reflection notes recorded for this trade.")).toBeInTheDocument();
  });

  it("renders reflection fields when present", () => {
    const trade: Trade = {
      ...baseTrade,
      status: "closed",
      exitPrice: 110,
      exitDate: "2026-07-02",
      mistakes: "Entered too early",
      lessonsLearned: "Wait for confirmation",
    };

    render(<TradeReplayView trade={trade} />);

    expect(screen.queryByText("No reflection notes recorded for this trade.")).not.toBeInTheDocument();
    expect(screen.getByText("Entered too early")).toBeInTheDocument();
    expect(screen.getByText("Wait for confirmation")).toBeInTheDocument();
  });
});
