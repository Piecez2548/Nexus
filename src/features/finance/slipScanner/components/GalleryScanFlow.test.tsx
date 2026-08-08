import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";
import { useLanguageStore } from "@/store/languageStore";

import GalleryScanFlow from "./GalleryScanFlow";

beforeEach(() => {
  useBankSelectionStore.getState().reset();
  useLanguageStore.setState({ language: "en" });
});

describe("GalleryScanFlow", () => {
  it("renders the Scan Gallery button", () => {
    render(<GalleryScanFlow />);
    expect(screen.getByRole("button", { name: "Scan Gallery" })).toBeInTheDocument();
  });

  it("opens the bank selection popup when the button is clicked", async () => {
    const user = userEvent.setup();
    render(<GalleryScanFlow />);

    // Popup is closed initially.
    expect(screen.queryByText("Select banks to scan")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Scan Gallery" }));

    expect(screen.getByText("Select banks to scan")).toBeInTheDocument();
  });
});
