import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import { useToastStore } from "@/store/toastStore";

import ScanRecoveryNotice from "./ScanRecoveryNotice";

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipImportHistory.clear();
  useToastStore.setState({ toasts: [] });
});

describe("ScanRecoveryNotice", () => {
  it("shows nothing when there is nothing to recover", async () => {
    render(<ScanRecoveryNotice />);

    // Let the mount effect's async detectRecovery() settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("surfaces a notice for a scan left running by a killed app", async () => {
    await db.slipScanRuns.add({
      status: "running",
      source: "test",
      startedAt: new Date().toISOString(),
      total: 10,
      done: 3,
      skipped: 0,
      failed: 0,
    });

    render(<ScanRecoveryNotice />);

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "info" });
    });
  });

  it("surfaces a notice when the last import ended partial", async () => {
    await db.slipImportHistory.add({
      importedAt: new Date().toISOString(),
      source: "gallery",
      importedCount: 1,
      failedCount: 1,
      status: "partial",
      durationMs: 100,
    });

    render(<ScanRecoveryNotice />);

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "info" });
    });
  });

  it("surfaces both notices when both a resumable scan and a failed import exist", async () => {
    await db.slipScanRuns.add({
      status: "paused",
      source: "test",
      startedAt: new Date().toISOString(),
      total: 10,
      done: 3,
      skipped: 0,
      failed: 0,
    });
    await db.slipImportHistory.add({
      importedAt: new Date().toISOString(),
      source: "gallery",
      importedCount: 0,
      failedCount: 1,
      status: "failed",
      durationMs: 50,
    });

    render(<ScanRecoveryNotice />);

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(2);
    });
  });
});
