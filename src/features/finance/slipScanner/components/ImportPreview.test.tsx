import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useLanguageStore } from "@/store/languageStore";

import ImportPreview from "./ImportPreview";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 50,
  ...over,
});

const list: SlipCandidate[] = [
  candidate({ id: "1", bankName: "SCB", merchant: "Coffee Shop", amount: 120, confidence: 90 }),
  candidate({ id: "2", bankName: "KBank", merchant: "Bookstore", amount: 550, isDuplicate: true, confidence: 60 }),
];

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

describe("ImportPreview", () => {
  it("lists candidates with bank, merchant, confidence tier and a duplicate badge", () => {
    render(<ImportPreview open onClose={() => {}} candidates={list} onImport={() => {}} />);
    expect(screen.getByText("Coffee Shop")).toBeInTheDocument();
    expect(screen.getByText("Bookstore")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    // Candidate 1: confidence 90 -> "high" tier.
    expect(screen.getByText((_, node) => node?.textContent === "High · 90%")).toBeInTheDocument();
    // Candidate 2: confidence 60 -> "medium" tier.
    expect(screen.getByText((_, node) => node?.textContent === "Medium · 60%")).toBeInTheDocument();
  });

  it("imports only the default (non-duplicate) selection", async () => {
    const onImport = vi.fn();
    const user = userEvent.setup();
    render(<ImportPreview open onClose={() => {}} candidates={list} onImport={onImport} />);

    // Default selection excludes the duplicate, so the button reads "Import 1 selected".
    await user.click(screen.getByRole("button", { name: "Import 1 selected" }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0].map((c: SlipCandidate) => c.id)).toEqual(["1"]);
  });

  it("filters to duplicates only", async () => {
    const user = userEvent.setup();
    render(<ImportPreview open onClose={() => {}} candidates={list} onImport={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Duplicates" }));
    expect(screen.getByText("Bookstore")).toBeInTheDocument();
    expect(screen.queryByText("Coffee Shop")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ImportPreview open onClose={() => {}} candidates={list} onImport={() => {}} />);

    await user.type(screen.getByPlaceholderText("Search merchant, reference, bank"), "nonexistent");
    expect(screen.getByText("No slips to preview")).toBeInTheDocument();
  });
});
