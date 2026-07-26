import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TransactionToolbar from "./TransactionToolbar";

function renderToolbar(overrides: Partial<Parameters<typeof TransactionToolbar>[0]> = {}) {
  const props = {
    search: "",
    setSearch: vi.fn(),
    filterType: "all",
    setFilterType: vi.fn(),
    filterCategory: "all",
    setFilterCategory: vi.fn(),
    filterAccount: "all",
    setFilterAccount: vi.fn(),
    filterDateFrom: "",
    setFilterDateFrom: vi.fn(),
    filterDateTo: "",
    setFilterDateTo: vi.fn(),
    categoryNames: ["Food", "Transport"],
    accountNames: ["Cash", "Bank"],
    total: 3,
    ...overrides,
  };

  render(<TransactionToolbar {...props} />);
  return props;
}

describe("TransactionToolbar", () => {
  it("lists real categories and accounts as filter options", () => {
    renderToolbar();

    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Transport" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cash" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bank" })).toBeInTheDocument();
  });

  it("calls setFilterCategory when a category is chosen", async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.selectOptions(screen.getByDisplayValue("All Categories"), "Food");

    expect(props.setFilterCategory).toHaveBeenCalledWith("Food");
  });

  it("calls setFilterAccount when an account is chosen", async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.selectOptions(screen.getByDisplayValue("All Accounts"), "Bank");

    expect(props.setFilterAccount).toHaveBeenCalledWith("Bank");
  });

  it("calls setFilterDateFrom and setFilterDateTo when the date range is changed", async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.type(screen.getByLabelText("From"), "2026-07-01");
    expect(props.setFilterDateFrom).toHaveBeenLastCalledWith("2026-07-01");

    await user.type(screen.getByLabelText("To"), "2026-07-31");
    expect(props.setFilterDateTo).toHaveBeenLastCalledWith("2026-07-31");
  });

  it("resets search, type, category, account, and date range together", async () => {
    const user = userEvent.setup();
    const props = renderToolbar({
      search: "coffee",
      filterType: "expense",
      filterCategory: "Food",
      filterAccount: "Cash",
      filterDateFrom: "2026-07-01",
      filterDateTo: "2026-07-31",
    });

    await user.click(screen.getByRole("button", { name: /reset/i }));

    expect(props.setSearch).toHaveBeenCalledWith("");
    expect(props.setFilterType).toHaveBeenCalledWith("all");
    expect(props.setFilterCategory).toHaveBeenCalledWith("all");
    expect(props.setFilterAccount).toHaveBeenCalledWith("all");
    expect(props.setFilterDateFrom).toHaveBeenCalledWith("");
    expect(props.setFilterDateTo).toHaveBeenCalledWith("");
  });
});
