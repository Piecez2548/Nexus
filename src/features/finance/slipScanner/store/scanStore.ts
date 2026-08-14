import { create } from "zustand";

import { createScanSession, type ScanSession } from "@/features/finance/slipScanner/services/scanSessionService";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import { toErrorMessage } from "@/utils/asyncState";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { ScanOptions, ScanProgress, ScanStatus } from "@/features/finance/slipScanner/models/scanTypes";

interface ScanState {
  status: ScanStatus;
  progress: ScanProgress | null;
  error: string | null;
  // `processor` defaults to the orchestrator's own no-op recorder when
  // omitted (GS-006 enumerate/hash/dedupe-only mode); callers that want real
  // extraction pass createSlipExtractionProcessor(...) here.
  start(provider: MediaProvider, options: ScanOptions, processor?: ScanProcessor): Promise<void>;
  pause(): void;
  resume(): void;
  cancel(): void;
}

// The active session controller — a non-serializable handle, so it lives
// outside the store's rendered state (the store only exposes status/progress).
let session: ScanSession | null = null;

export const useScanStore = create<ScanState>((set) => ({
  status: "idle",
  progress: null,
  error: null,

  async start(provider, options, processor) {
    // Ignore a second start while one is already running/paused.
    if (session && (session.control.status === "running" || session.control.status === "paused")) return;

    set({ status: "running", progress: null, error: null });
    session = createScanSession({
      provider,
      options,
      processor,
      onProgress: (progress, status) => set({ progress, status }),
    });

    try {
      await session.done;
    } catch (err) {
      set({ status: "error", error: toErrorMessage(err) });
    } finally {
      session = null;
    }
  },

  pause() {
    session?.control.pause();
    if (session) set({ status: "paused" });
  },

  resume() {
    session?.control.resume();
    if (session) set({ status: "running" });
  },

  cancel() {
    // Status flips to "cancelled" when the loop finalises and emits.
    session?.control.cancel();
  },
}));
