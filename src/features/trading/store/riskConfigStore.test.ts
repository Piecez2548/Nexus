import { describe, expect, it, beforeEach } from "vitest";
import { useRiskConfigStore } from "./riskConfigStore";

describe("riskConfigStore", () => {
  beforeEach(() => {
    useRiskConfigStore.setState({ maxDailyLossLimit: null, maxWeeklyLossLimit: null });
  });

  it("starts with no limit set on either field", () => {
    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBeNull();
    expect(useRiskConfigStore.getState().maxWeeklyLossLimit).toBeNull();
  });

  it("sets and clears the max daily loss limit", () => {
    useRiskConfigStore.getState().setMaxDailyLossLimit(500);
    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBe(500);

    useRiskConfigStore.getState().setMaxDailyLossLimit(null);
    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBeNull();
  });

  it("sets the max weekly loss limit independently of the daily one", () => {
    useRiskConfigStore.getState().setMaxDailyLossLimit(500);
    useRiskConfigStore.getState().setMaxWeeklyLossLimit(2000);

    expect(useRiskConfigStore.getState().maxDailyLossLimit).toBe(500);
    expect(useRiskConfigStore.getState().maxWeeklyLossLimit).toBe(2000);
  });
});
