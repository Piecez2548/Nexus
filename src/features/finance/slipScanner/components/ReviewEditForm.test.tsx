import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useLanguageStore } from "@/store/languageStore";

import ReviewEditForm from "./ReviewEditForm";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 90,
  ...over,
});

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useCategoryStore.setState({ categories: [], loading: false, error: null });
  useCategoryLearningStore.getState().reset();
});

describe("ReviewEditForm", () => {
  it("pre-fills fields from the candidate and saves an edited patch", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ReviewEditForm
        candidate={candidate({ amount: 120, merchant: "Coffee Shop" })}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );

    const amountInput = screen.getByLabelText("Amount");
    expect(amountInput).toHaveValue(120);

    await user.clear(amountInput);
    await user.type(amountInput, "150");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ amount: 150, merchant: "Coffee Shop", category: undefined });
  });

  it("calls onCancel without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<ReviewEditForm candidate={candidate({ amount: 50 })} onSave={onSave} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("lists the user's own expense categories in the select, not income ones", () => {
    useCategoryStore.setState({
      categories: [
        { id: 1, name: "Food", type: "expense", icon: "🍔", color: "#fff" },
        { id: 2, name: "Salary", type: "income", icon: "💰", color: "#000" },
      ],
      loading: false,
      error: null,
    });
    render(<ReviewEditForm candidate={candidate({ amount: 50 })} onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Salary" })).not.toBeInTheDocument();
  });

  it("records a learned category correction when the picked category is one of the fixed SlipCategory values", async () => {
    useCategoryStore.setState({
      categories: [{ id: 1, name: "Food", type: "expense", icon: "🍔", color: "#fff" }],
      loading: false,
      error: null,
    });
    const user = userEvent.setup();
    render(
      <ReviewEditForm
        candidate={candidate({ amount: 50, merchant: "Some Cafe" })}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(useCategoryLearningStore.getState().asMap().get("some cafe")).toBe("Food");
  });

  it("does not record a learned correction for a category the fixed guesser doesn't know (e.g. a custom 'Gym' category)", async () => {
    useCategoryStore.setState({
      categories: [{ id: 1, name: "Gym", type: "expense", icon: "🏋️", color: "#fff" }],
      loading: false,
      error: null,
    });
    const user = userEvent.setup();
    render(
      <ReviewEditForm
        candidate={candidate({ amount: 50, merchant: "Fit Club" })}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Category"), "Gym");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(useCategoryLearningStore.getState().asMap().size).toBe(0);
  });
});
