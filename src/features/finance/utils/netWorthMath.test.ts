import { describe, expect, it } from "vitest";

import { calculateNetWorthTotals } from "./netWorthMath";
import type { NetWorthItem } from "@/features/finance/types";

function asset(value: number, overrides: Partial<NetWorthItem> = {}): NetWorthItem {
  return { kind: "asset", name: "Asset", category: "cash", value, icon: "wallet", color: "#16a34a", createdAt: "2026-08-18T00:00:00.000Z", ...overrides };
}

function liability(value: number, overrides: Partial<NetWorthItem> = {}): NetWorthItem {
  return { kind: "liability", name: "Liability", category: "loan", value, icon: "banknote", color: "#dc2626", createdAt: "2026-08-18T00:00:00.000Z", ...overrides };
}

describe("calculateNetWorthTotals", () => {
  it("returns all zeros for an empty list", () => {
    expect(calculateNetWorthTotals([])).toEqual({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
  });

  it("sums assets only, with zero liabilities", () => {
    const totals = calculateNetWorthTotals([asset(100), asset(200)]);
    expect(totals).toEqual({ totalAssets: 300, totalLiabilities: 0, netWorth: 300 });
  });

  it("sums liabilities only, with zero assets", () => {
    const totals = calculateNetWorthTotals([liability(50), liability(75)]);
    expect(totals).toEqual({ totalAssets: 0, totalLiabilities: 125, netWorth: -125 });
  });

  it("combines multiple assets and multiple liabilities into one net worth figure", () => {
    const totals = calculateNetWorthTotals([asset(1000), asset(500), liability(300), liability(200)]);
    expect(totals).toEqual({ totalAssets: 1500, totalLiabilities: 500, netWorth: 1000 });
  });

  it("goes negative when liabilities exceed assets", () => {
    const totals = calculateNetWorthTotals([asset(100), liability(400)]);
    expect(totals.netWorth).toBe(-300);
  });

  it("treats a zero-value item as a real, counted item that contributes nothing", () => {
    const totals = calculateNetWorthTotals([asset(0), asset(100)]);
    expect(totals).toEqual({ totalAssets: 100, totalLiabilities: 0, netWorth: 100 });
  });

  it("is order-independent (calculation consistency regardless of item order)", () => {
    const items = [asset(100), liability(40), asset(60), liability(10)];
    const forward = calculateNetWorthTotals(items);
    const reversed = calculateNetWorthTotals([...items].reverse());
    expect(forward).toEqual(reversed);
  });
});
