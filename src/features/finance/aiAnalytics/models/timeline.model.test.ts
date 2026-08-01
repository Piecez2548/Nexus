import { describe, expect, it } from "vitest";
import { severityForTimelineEvent } from "@/features/finance/aiAnalytics/models/timeline.model";

describe("severityForTimelineEvent", () => {
  it("is warning for budgetExceeded", () => {
    expect(severityForTimelineEvent("budgetExceeded")).toBe("warning");
  });

  it.each(["salaryReceived", "largePurchase", "monthlySummary", "savingMilestone", "highestSpendingDay"] as const)(
    "is info for %s",
    (type) => {
      expect(severityForTimelineEvent(type)).toBe("info");
    }
  );
});
