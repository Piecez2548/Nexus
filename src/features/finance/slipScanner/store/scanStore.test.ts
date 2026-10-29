import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/database/db";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import { useScanStore } from "./scanStore";

function provider(count: MediaProvider["count"]): MediaProvider {
  return {
    id: "test-provider",
    capabilities: { canEnumerate: true, needsPermission: false },
    count,
    async *enumerate() {},
    async readBytes() { return new Uint8Array(); },
  };
}

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
  await db.slipScanCandidates.clear();
  useScanStore.setState({ status: "idle", progress: null, error: null });
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("scan store lifecycle", () => {
  it("can start a fresh manual scan after cancellation", async () => {
    let finishCount!: (count: number) => void;
    let markCountStarted!: () => void;
    const started = new Promise<void>((resolve) => { markCountStarted = resolve; });
    const firstProvider = provider(() => {
      markCountStarted();
      return new Promise<number>((resolve) => { finishCount = resolve; });
    });
    const firstRun = useScanStore.getState().start(firstProvider, { source: "test", incremental: false });
    await started;
    useScanStore.getState().cancel();
    finishCount(0);
    await firstRun;
    expect(useScanStore.getState().status).toBe("cancelled");

    await useScanStore.getState().start(provider(async () => 0), { source: "test", incremental: false });
    expect(useScanStore.getState().status).toBe("completed");
  });

  it("can start a fresh scan after a recoverable session error", async () => {
    const failed = useScanStore.getState().start(provider(async () => { throw new Error("provider unavailable"); }), {
      source: "test",
      incremental: false,
    });
    await expect(failed).rejects.toThrow("provider unavailable");
    expect(useScanStore.getState().status).toBe("error");

    await useScanStore.getState().start(provider(async () => 0), { source: "test", incremental: false });
    expect(useScanStore.getState().status).toBe("completed");
  });
});
