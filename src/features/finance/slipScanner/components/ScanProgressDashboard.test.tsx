import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { ScanProgressSnapshot } from "@/features/finance/slipScanner/progress/scanProgress";
import { useLanguageStore } from "@/store/languageStore";

import ScanProgressDashboard from "./ScanProgressDashboard";

const snapshot: ScanProgressSnapshot = {
  total: 100,
  scanned: 40,
  qrDetected: 25,
  ocrProcessed: 15,
  imported: 30,
  remaining: 60,
  elapsedMs: 20_000,
  speedPerSec: 2,
  etaMs: 30_000,
  percent: 40,
};

beforeEach(() => useLanguageStore.setState({ language: "en" }));

describe("ScanProgressDashboard", () => {
  it("renders the metrics and progress bar", () => {
    render(<ScanProgressDashboard progress={snapshot} />);
    expect(screen.getByText("Scan progress")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument(); // scanned
    expect(screen.getByText("2.0/s")).toBeInTheDocument(); // speed
    expect(screen.getByText("0:30")).toBeInTheDocument(); // eta
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });
});
