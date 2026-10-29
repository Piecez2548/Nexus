import { afterEach, describe, expect, it, vi } from "vitest";

import { getScannerDiagnostics, recordScannerDiagnostic, subscribeScannerDiagnostics } from "./scannerDiagnostics";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("scanner diagnostics", () => {
  it("emits only stage/count/duration/category fields and excludes supplied financial content by contract", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const received: unknown[] = [];
    const unsubscribe = subscribeScannerDiagnostics((event) => received.push(event));

    recordScannerDiagnostic("CANDIDATE_CREATED", { count: 1, durationMs: 20 });
    unsubscribe();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ name: "CANDIDATE_CREATED", count: 1, durationMs: 20 });
    expect(JSON.stringify(received[0])).not.toMatch(/payload|amount|merchant|account|ocrText|filename/i);
    expect(consoleInfo).toHaveBeenCalledWith("[NexusScanner]", expect.objectContaining({ name: "CANDIDATE_CREATED" }));
    expect(getScannerDiagnostics().at(-1)?.name).toBe("CANDIDATE_CREATED");
  });
});
