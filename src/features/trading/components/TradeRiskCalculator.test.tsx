import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";

import TradeRiskCalculator from "./TradeRiskCalculator";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";

function Harness({ defaultValues }: { defaultValues: Partial<TradeFormData> }) {
  const { watch, setValue } = useForm<TradeFormData>({
    defaultValues: {
      symbol: "",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 0,
      quantity: 0,
      entryDate: "2026-07-21",
      ...defaultValues,
    },
  });

  return <TradeRiskCalculator watch={watch} setValue={setValue} />;
}

describe("TradeRiskCalculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows placeholders when there isn't enough data to calculate", () => {
    render(<Harness defaultValues={{}} />);

    expect(screen.getAllByText("-")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Apply to Lot Size" })).toBeDisabled();
  });

  it("computes position size and max loss from account balance, risk %, entry, and stop loss", async () => {
    render(<Harness defaultValues={{ entryPrice: 100, stopLoss: 90, riskPercent: 1 }} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Account Balance"), "10000");

    // riskAmount = 10000 * 1% = 100; stopDistance = |100-90| = 10; positionSize = 100/10 = 10.
    // "10.0000" appears twice: Lot Size and Position Size show the same value.
    expect(await screen.findAllByText("10.0000")).toHaveLength(2);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("applies the calculated position size to the Lot Size field", async () => {
    const setValueSpy = vi.fn();
    function HarnessWithSpy() {
      const { watch } = useForm<TradeFormData>({
        defaultValues: {
          symbol: "",
          market: "stocks",
          direction: "long",
          status: "open",
          entryPrice: 100,
          stopLoss: 90,
          riskPercent: 1,
          quantity: 0,
          entryDate: "2026-07-21",
        },
      });

      return <TradeRiskCalculator watch={watch} setValue={setValueSpy} />;
    }

    render(<HarnessWithSpy />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Account Balance"), "10000");

    await user.click(await screen.findByRole("button", { name: "Apply to Lot Size" }));

    expect(setValueSpy).toHaveBeenCalledWith("quantity", 10);
    expect(setValueSpy).toHaveBeenCalledWith("positionSize", 10);
  });
});
