import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/database/db";
import type { ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";
import { useLanguageStore } from "@/store/languageStore";

import ImportHistoryDrawer from "./ImportHistoryDrawer";

const entry = (over: Partial<ImportHistoryEntry> = {}): ImportHistoryEntry => ({
  importedAt: "2026-08-10T10:00:00.000Z",
  source: "gallery",
  bank: "SCB",
  amount: 500,
  importedCount: 2,
  failedCount: 0,
  status: "success",
  durationMs: 500,
  ...over,
});

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.slipImportHistory.clear();
});

describe("ImportHistoryDrawer", () => {
  it("shows the empty state when there is no history", async () => {
    render(<ImportHistoryDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("No import history yet")).toBeInTheDocument());
  });

  it("lists entries with bank, status and imported/failed counts", async () => {
    await db.slipImportHistory.add(entry({ bank: "SCB", importedCount: 3, failedCount: 0, status: "success" }));
    await db.slipImportHistory.add(
      entry({ bank: "KBank", importedCount: 1, failedCount: 2, status: "partial", errors: ["amount missing"] }),
    );

    render(<ImportHistoryDrawer open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("SCB")).toBeInTheDocument());
    expect(screen.getByText("KBank")).toBeInTheDocument();
    expect(screen.getByText("3 imported")).toBeInTheDocument();
    expect(screen.getByText("2 failed")).toBeInTheDocument();
    expect(screen.getByText("amount missing")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    await db.slipImportHistory.add(entry({ bank: "SCB", status: "success" }));
    await db.slipImportHistory.add(entry({ bank: "KBank", status: "failed", importedCount: 0, failedCount: 1 }));

    render(<ImportHistoryDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("SCB")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Failed" }));
    expect(screen.queryByText("SCB")).not.toBeInTheDocument();
    expect(screen.getByText("KBank")).toBeInTheDocument();
  });

  it("clears history after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await db.slipImportHistory.add(entry());

    render(<ImportHistoryDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("SCB")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Clear history" }));
    await waitFor(() => expect(screen.getByText("No import history yet")).toBeInTheDocument());
    expect(await db.slipImportHistory.count()).toBe(0);

    vi.restoreAllMocks();
  });

  it("does not clear history when the confirmation is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await db.slipImportHistory.add(entry());

    render(<ImportHistoryDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("SCB")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Clear history" }));
    expect(screen.getByText("SCB")).toBeInTheDocument();
    expect(await db.slipImportHistory.count()).toBe(1);

    vi.restoreAllMocks();
  });
});
