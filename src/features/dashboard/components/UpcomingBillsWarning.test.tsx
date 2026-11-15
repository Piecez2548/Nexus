import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { useAccountStore } from "@/features/finance/store/accountStore";
import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { toLocalDateString } from "@/utils/localDate";
import UpcomingBillsWarning from "./UpcomingBillsWarning";
import type { Subscription } from "@/features/finance/types";

function inDays(days: number): string {
  const d = new Date();
  return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

function bill(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    name: "Rent",
    amount: 5000,
    billingFrequency: "monthly",
    nextBillingDate: inDays(3),
    status: "active",
    icon: "home",
    color: "#dc2626",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderWarning(balance: number, subscriptions: Subscription[]) {
  useSubscriptionStore.setState({ subscriptions, loadSubscriptions: async () => {} });
  return render(
    <MemoryRouter>
      <UpcomingBillsWarning balance={balance} transactions={[]} />
    </MemoryRouter>
  );
}

describe("UpcomingBillsWarning", () => {
  beforeEach(() => {
    useSubscriptionStore.setState({ subscriptions: [] });
    useAccountStore.setState({ accounts: [], loadAccounts: async () => {} });
  });

  it("warns when bills due soon exceed the balance", () => {
    renderWarning(1000, [bill()]);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/subscriptions");
  });

  it("stays quiet when the balance covers the bills", () => {
    const { container } = renderWarning(9000, [bill()]);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays quiet when expected income covers the shortfall", () => {
    const { container } = renderWarning(1000, [
      bill(),
      bill({ id: 2, name: "Salary", amount: 30000, kind: "income", nextBillingDate: inDays(2) }),
    ]);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays quiet with no subscriptions", () => {
    const { container } = renderWarning(-500, []);
    expect(container).toBeEmptyDOMElement();
  });

  it("warns for a tracked account that cannot cover its own bills", () => {
    useAccountStore.setState({
      accounts: [{ name: "Cash", type: "cash", icon: "wallet", color: "#000", openingBalance: 1000 }],
      loadAccounts: async () => {},
    });
    renderWarning(50000, [bill({ account: "Cash" })]);

    expect(screen.getByRole("status")).toHaveTextContent("Cash");
  });

  it("ignores accounts without an opening balance", () => {
    useAccountStore.setState({
      accounts: [{ name: "Cash", type: "cash", icon: "wallet", color: "#000" }],
      loadAccounts: async () => {},
    });
    const { container } = renderWarning(50000, [bill({ account: "Cash" })]);
    expect(container).toBeEmptyDOMElement();
  });
});
