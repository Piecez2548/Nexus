import { describe, expect, it } from "vitest";
import { nextDueDate } from "./recurrence";

describe("nextDueDate", () => {
  it("advances a daily recurrence by one day", () => {
    expect(nextDueDate("daily", "2026-07-22")).toBe("2026-07-23");
  });

  it("advances a weekly recurrence by seven days", () => {
    expect(nextDueDate("weekly", "2026-07-22")).toBe("2026-07-29");
  });

  it("advances a monthly recurrence by one month", () => {
    expect(nextDueDate("monthly", "2026-07-22")).toBe("2026-08-22");
  });

  it("rolls over into the next month for a daily recurrence at month end", () => {
    expect(nextDueDate("daily", "2026-07-31")).toBe("2026-08-01");
  });

  it("rolls over into the next year for a monthly recurrence in December", () => {
    expect(nextDueDate("monthly", "2026-12-15")).toBe("2027-01-15");
  });

  it("anchors on today when no fromDate is given", () => {
    const today = new Date();
    const expected = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;

    expect(nextDueDate("daily")).toBe(expectedStr);
  });
});
