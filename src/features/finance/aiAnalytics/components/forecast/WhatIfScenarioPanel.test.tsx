import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import WhatIfScenarioPanel from "./WhatIfScenarioPanel";
import { useLanguageStore } from "@/store/languageStore";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

const spendingAnalysis: SpendingAnalysisResult = {
  topCategories: [{ category: "Food", amount: 1000, percentOfTotal: 50 }],
  categoryComparison: [],
  monthlyTrend: [],
  dailyTrend: [],
  weekdayAnalysis: [],
  weeklyTrend: [],
  highestSpendingDay: null,
  mostExpensiveWeek: null,
};

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("WhatIfScenarioPanel", () => {
  // Regression (P2, found in a Full System Verification pass): the
  // reduceFoodSpending percent field's min/max HTML attributes only gate
  // native form-submit validation, not the onChange handler that actually
  // drove the simulation -- typing an out-of-range value like 500 computed
  // a mathematically impossible "500% savings" figure as a real headline
  // number.
  it("clamps a reduction percent above 100 instead of computing an impossible >100% savings figure", async () => {
    const user = userEvent.setup();
    render(<WhatIfScenarioPanel goalProgress={[]} spendingAnalysis={spendingAnalysis} subscriptions={[]} now={new Date(2026, 7, 18)} />);

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "500");

    // Food spend is ฿1000/month; 500% unclamped would be ฿5000 -- clamped
    // to 100% it must be exactly ฿1000, never more than the actual spend.
    expect(await screen.findByText("฿1,000")).toBeInTheDocument();
    expect(screen.queryByText("฿5,000")).not.toBeInTheDocument();
  });

  it("clamps a negative reduction percent to 0 instead of a negative 'savings' figure", async () => {
    render(<WhatIfScenarioPanel goalProgress={[]} spendingAnalysis={spendingAnalysis} subscriptions={[]} now={new Date(2026, 7, 18)} />);

    const input = screen.getByRole("spinbutton");
    // fireEvent.change, not userEvent.type -- jsdom's type="number" input
    // silently strips a leading "-" during simulated per-keystroke typing,
    // never actually delivering a negative string to onChange. A directly
    // dispatched change event (what a pasted or programmatically-set value
    // would produce) reaches the handler with the real, unfiltered string.
    fireEvent.change(input, { target: { value: "-50" } });

    // Both the monthly and yearly figures show ฿0 -- clamped to 0%, not a
    // negative "savings" amount.
    const zeroFigures = await screen.findAllByText("฿0");
    expect(zeroFigures).toHaveLength(2);
  });
});
