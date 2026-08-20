import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import HoldingCard from "./HoldingCard";
import { useLanguageStore } from "@/store/languageStore";
import type { Holding } from "@/features/portfolio/types";

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    symbol: "GIFT",
    market: "stocks",
    quantity: 10,
    avgCostPrice: 0,
    currentPrice: 50,
    createdAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("HoldingCard", () => {
  // Regression: a zero-cost-basis (gifted) holding showed a misleading
  // "+0.00%" instead of N/A -- unrealizedPnlPercent is mathematically
  // undefined (division by zero) when avgCostPrice is 0, but the real
  // dollar unrealizedPnl can still be a large, real, non-zero amount.
  it("shows N/A for the percent on a zero-cost-basis holding, not a misleading +0.00%", () => {
    render(<HoldingCard holding={holding()} onEdit={() => {}} />);

    expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    expect(screen.queryByText(/0\.00%/)).not.toBeInTheDocument();
  });

  it("still shows a real percent for a normal (non-zero-cost) holding", () => {
    render(<HoldingCard holding={holding({ avgCostPrice: 25, currentPrice: 50 })} onEdit={() => {}} />);

    expect(screen.getByText(/\+100%/)).toBeInTheDocument();
  });
});
