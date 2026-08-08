import { describe, expect, it } from "vitest";

import { computeScanProgress, formatEta } from "./scanProgress";

describe("computeScanProgress", () => {
  it("computes speed, remaining, ETA and percent", () => {
    const snap = computeScanProgress(
      { total: 100, scanned: 20, qrDetected: 12, ocrProcessed: 8, imported: 15 },
      1000,
      11_000, // 10s elapsed
    );
    expect(snap.speedPerSec).toBeCloseTo(2); // 20 in 10s
    expect(snap.remaining).toBe(80);
    expect(snap.percent).toBe(20);
    expect(snap.etaMs).toBe(40_000); // 80 / 2 = 40s
  });

  it("leaves remaining/eta/percent null when total is unknown", () => {
    const snap = computeScanProgress({ total: null, scanned: 5, qrDetected: 0, ocrProcessed: 0, imported: 0 }, 0, 5000);
    expect(snap.remaining).toBeNull();
    expect(snap.etaMs).toBeNull();
    expect(snap.percent).toBeNull();
  });

  it("is safe at zero elapsed time", () => {
    const snap = computeScanProgress({ total: 10, scanned: 0, qrDetected: 0, ocrProcessed: 0, imported: 0 }, 1000, 1000);
    expect(snap.speedPerSec).toBe(0);
    expect(snap.etaMs).toBeNull();
  });
});

describe("formatEta", () => {
  it("formats milliseconds as M:SS, or — when unknown", () => {
    expect(formatEta(90_000)).toBe("1:30");
    expect(formatEta(5000)).toBe("0:05");
    expect(formatEta(null)).toBe("—");
  });
});
