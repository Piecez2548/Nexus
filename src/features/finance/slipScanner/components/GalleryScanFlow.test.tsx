import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { SlipExtractor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import { useLanguageStore } from "@/store/languageStore";

import GalleryScanFlow from "./GalleryScanFlow";

const fakeExtractor: SlipExtractor = async ({ assetId }): Promise<SlipCandidate> => ({
  id: assetId,
  assetId,
  source: "qr",
  isDuplicate: false,
  confidence: 90,
  amount: 100,
  merchant: "Coffee Shop",
});

function file(name: string, content: string): File {
  return new File([content], name, { type: "image/jpeg" });
}

beforeEach(async () => {
  useBankSelectionStore.getState().reset();
  useLanguageStore.setState({ language: "en" });
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
  await db.transactions.clear();
  await db.slipImportHistory.clear();
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

  it("shows the date-range picker in the scan setup popup, defaulting to blank (whole gallery)", async () => {
    const user = userEvent.setup();
    render(<GalleryScanFlow />);

    await user.click(screen.getByRole("button", { name: "Scan Gallery" }));

    expect(screen.getByText("Date range (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("");
    expect(screen.getByLabelText("To")).toHaveValue("");
  });

  it("drives the full web flow through the real orchestrator: bank confirm -> file pick -> scan progress -> Import Preview -> Smart Import", async () => {
    const user = userEvent.setup();
    render(<GalleryScanFlow extractor={fakeExtractor} />);

    await user.click(screen.getByRole("button", { name: "Scan Gallery" }));
    await user.click(screen.getByRole("button", { name: "Start scan" }));

    // Not on native in jsdom, so confirming banks falls through to the
    // hidden file input instead of auto-enumerating.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, [file("a.jpg", "gallery-flow-1"), file("b.jpg", "gallery-flow-2")]);

    // The scan runs through useFullGalleryScan -> createScanSession (the
    // same orchestrator a real native full-gallery scan would use), showing
    // live progress while in flight.
    await waitFor(() => expect(screen.getByText("Scan progress")).toBeInTheDocument());

    // Once it completes, Import Preview opens with both extracted candidates.
    await waitFor(() => expect(screen.getByText("Import preview")).toBeInTheDocument());
    expect(screen.getAllByText("Coffee Shop")).toHaveLength(2);

    // Smart Import commits a real transaction through the same path GS-016 uses.
    await user.click(screen.getByRole("button", { name: /Import \d+ selected/ }));
    await waitFor(async () => expect(await db.transactions.count()).toBe(2));

    const imported = await db.transactions.toArray();
    expect(imported.every((t) => t.title === "Coffee Shop")).toBe(true);
  });
});
