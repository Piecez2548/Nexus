import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";
import { useLanguageStore } from "@/store/languageStore";

import BankSelectionPopup from "./BankSelectionPopup";

beforeEach(() => {
  useBankSelectionStore.getState().reset();
  useLanguageStore.setState({ language: "en" });
});

describe("BankSelectionPopup", () => {
  it("renders the bank list and the estimated image count / time", () => {
    render(<BankSelectionPopup open onClose={() => {}} onConfirm={() => {}} imageCount={100} />);

    expect(screen.getByText("Select banks to scan")).toBeInTheDocument();
    expect(screen.getByText("SCB")).toBeInTheDocument();
    expect(screen.getAllByText("PromptPay").length).toBeGreaterThan(0);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("40 sec")).toBeInTheDocument();
  });

  it("confirms with all banks selected by default", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<BankSelectionPopup open onClose={() => {}} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Start scan" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toContain("scb");
  });

  it("disables Start scan and shows a hint when nothing is selected", async () => {
    const user = userEvent.setup();
    render(<BankSelectionPopup open onClose={() => {}} onConfirm={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Deselect all" }));

    expect(screen.getByRole("button", { name: "Start scan" })).toBeDisabled();
    expect(screen.getByText("Select at least one bank")).toBeInTheDocument();
  });

  it("filters the list via the search box", async () => {
    const user = userEvent.setup();
    render(<BankSelectionPopup open onClose={() => {}} onConfirm={() => {}} />);

    await user.type(screen.getByPlaceholderText("Search bank"), "kasikorn");

    expect(screen.getByText("KBank")).toBeInTheDocument();
    expect(screen.queryByText("SCB")).not.toBeInTheDocument();
  });

  it("does not render date-range fields when no date change handler is supplied", () => {
    render(<BankSelectionPopup open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByText("Date range (optional)")).not.toBeInTheDocument();
  });

  it("renders date-range fields and reports changes when handlers are supplied", async () => {
    const onDateFromChange = vi.fn();
    const onDateToChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BankSelectionPopup
        open
        onClose={() => {}}
        onConfirm={() => {}}
        dateFrom=""
        dateTo=""
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />,
    );

    expect(screen.getByText("Date range (optional)")).toBeInTheDocument();

    await user.type(screen.getByLabelText("From"), "2026-01-15");
    expect(onDateFromChange).toHaveBeenCalledWith("2026-01-15");

    await user.type(screen.getByLabelText("To"), "2026-02-15");
    expect(onDateToChange).toHaveBeenCalledWith("2026-02-15");
  });

  it("constrains the From field's max and the To field's min against each other", () => {
    render(
      <BankSelectionPopup
        open
        onClose={() => {}}
        onConfirm={() => {}}
        dateFrom="2026-01-15"
        dateTo="2026-02-15"
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("From")).toHaveAttribute("max", "2026-02-15");
    expect(screen.getByLabelText("To")).toHaveAttribute("min", "2026-01-15");
  });
});
