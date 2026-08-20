import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it } from "vitest";

import TradeCoreFields from "./TradeCoreFields";
import { useLanguageStore } from "@/store/languageStore";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";

function Harness() {
  const { register, watch, setValue, formState } = useForm<TradeFormData>({
    defaultValues: {
      symbol: "",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 0,
      quantity: 0,
      entryDate: "2026-08-20",
      tags: [],
      screenshots: [],
    },
  });

  return <TradeCoreFields register={register} watch={watch} setValue={setValue} errors={formState.errors} />;
}

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("TradeCoreFields", () => {
  it("still auto-detects the market from a recognized symbol when the user hasn't overridden it", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Symbol"), "XAUUSD");

    expect(screen.getByLabelText("Market (AI auto-detected)")).toHaveValue("cfd");
  });

  // Regression: auto-detection used to re-fire and silently overwrite the
  // market on every symbol keystroke, even after the user had manually
  // picked a different one -- contradicting its own "still fully editable"
  // comment.
  it("does not overwrite a manually-picked market when the symbol is edited again afterward", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const symbolInput = screen.getByLabelText("Symbol");
    const marketSelect = screen.getByLabelText("Market (AI auto-detected)");

    await user.type(symbolInput, "XAUUSD");
    expect(marketSelect).toHaveValue("cfd");

    // User overrides the auto-detected choice.
    await user.selectOptions(marketSelect, "commodities");
    expect(marketSelect).toHaveValue("commodities");

    // Editing the symbol again (e.g. appending a broker suffix) still
    // matches the same "cfd" detection rule -- the manual choice must survive.
    await user.type(symbolInput, "M");
    expect(marketSelect).toHaveValue("commodities");
  });
});
