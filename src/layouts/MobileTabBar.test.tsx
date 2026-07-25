import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import MobileTabBar from "./MobileTabBar";
import { useUIStore } from "@/features/finance/store/uiStore";

describe("MobileTabBar", () => {
  it("renders links for Dashboard, Transactions, and Budget", () => {
    render(<MobileTabBar onMoreClick={() => {}} />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /transactions/i })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: /budget/i })).toHaveAttribute("href", "/budget");
  });

  it("opens the transaction drawer when the FAB is clicked", async () => {
    useUIStore.setState({ isTransactionDrawerOpen: false, selectedTransaction: null, draftTransaction: null });

    const user = userEvent.setup();
    render(<MobileTabBar onMoreClick={() => {}} />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(useUIStore.getState().isTransactionDrawerOpen).toBe(true);
  });

  it("calls onMoreClick when the More button is pressed", async () => {
    const onMoreClick = vi.fn();
    const user = userEvent.setup();
    render(<MobileTabBar onMoreClick={onMoreClick} />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: "More" }));

    expect(onMoreClick).toHaveBeenCalledTimes(1);
  });
});
