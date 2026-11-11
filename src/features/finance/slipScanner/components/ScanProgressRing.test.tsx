import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeScanProgress } from "@/features/finance/slipScanner/progress/scanProgress";
import { useLanguageStore } from "@/store/languageStore";

import ScanProgressRing from "./ScanProgressRing";

const handlers = () => ({ onPause: vi.fn(), onResume: vi.fn(), onCancel: vi.fn(), onBackground: vi.fn() });

beforeEach(() => useLanguageStore.setState({ language: "en" }));

describe("ScanProgressRing", () => {
  it("shows the real percent and photo count", () => {
    const progress = computeScanProgress({ total: 40, scanned: 10, qrDetected: 2, ocrProcessed: 0, imported: 0 }, 0, 1000);
    render(<ScanProgressRing progress={progress} running {...handlers()} />);

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("10 of 40 photos")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });

  it("shows a preparing state before progress is known", () => {
    render(<ScanProgressRing progress={null} running {...handlers()} />);
    expect(screen.getByText("Preparing…")).toBeInTheDocument();
  });

  it("sends the scan to the background and cancels via the buttons", async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<ScanProgressRing progress={null} running {...h} />);

    await user.click(screen.getByRole("button", { name: "Run in background" }));
    expect(h.onBackground).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel scan" }));
    expect(h.onCancel).toHaveBeenCalledTimes(1);
  });
});
