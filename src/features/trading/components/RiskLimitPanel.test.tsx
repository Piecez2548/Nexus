import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import RiskLimitPanel from "./RiskLimitPanel";
import { useRiskConfigStore } from "@/features/trading/store/riskConfigStore";
import { useLanguageStore } from "@/store/languageStore";

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useRiskConfigStore.setState({ maxDailyLossLimit: null, maxWeeklyLossLimit: null });
});

describe("RiskLimitPanel", () => {
  it("shows no warning when there is no limit configured, regardless of P/L", () => {
    render(<RiskLimitPanel todayPnl={-9999} weeklyPnl={-9999} />);
    expect(screen.queryByText(/max daily loss limit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/max weekly loss limit/)).not.toBeInTheDocument();
  });

  it("shows no warning when the loss is below the configured limit", () => {
    useRiskConfigStore.setState({ maxDailyLossLimit: 500, maxWeeklyLossLimit: null });
    render(<RiskLimitPanel todayPnl={-100} weeklyPnl={0} />);
    expect(screen.queryByText(/max daily loss limit/)).not.toBeInTheDocument();
  });

  it("shows no warning for a positive P/L even with a limit configured", () => {
    useRiskConfigStore.setState({ maxDailyLossLimit: 500, maxWeeklyLossLimit: null });
    render(<RiskLimitPanel todayPnl={1000} weeklyPnl={0} />);
    expect(screen.queryByText(/max daily loss limit/)).not.toBeInTheDocument();
  });

  it("warns once today's loss reaches the configured daily limit", () => {
    useRiskConfigStore.setState({ maxDailyLossLimit: 500, maxWeeklyLossLimit: null });
    render(<RiskLimitPanel todayPnl={-500} weeklyPnl={0} />);
    expect(screen.getByText(/max daily loss limit/)).toBeInTheDocument();
  });

  it("warns once this week's loss reaches the configured weekly limit, independent of the daily one", () => {
    useRiskConfigStore.setState({ maxDailyLossLimit: null, maxWeeklyLossLimit: 2000 });
    render(<RiskLimitPanel todayPnl={-100} weeklyPnl={-2500} />);
    expect(screen.getByText(/max weekly loss limit/)).toBeInTheDocument();
    expect(screen.queryByText(/max daily loss limit/)).not.toBeInTheDocument();
  });

  it("persists a limit entered into the input to the store", async () => {
    const user = userEvent.setup();
    render(<RiskLimitPanel todayPnl={0} weeklyPnl={0} />);

    await user.type(screen.getByLabelText("Max Daily Loss"), "750");

    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBe(750);
  });

  it("clearing the input resets the limit to null (no limit), not 0", async () => {
    useRiskConfigStore.setState({ maxDailyLossLimit: 500, maxWeeklyLossLimit: null });
    const user = userEvent.setup();
    render(<RiskLimitPanel todayPnl={0} weeklyPnl={0} />);

    await user.clear(screen.getByLabelText("Max Daily Loss"));

    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBeNull();
  });
});
