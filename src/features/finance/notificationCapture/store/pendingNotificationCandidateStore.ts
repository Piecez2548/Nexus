import { create } from "zustand";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { buildNotificationCandidate } from "../models/buildNotificationCandidate";
import { PaymentNotificationCapture } from "../native/notificationCapturePlugin";

interface PendingNotificationCandidateState {
  candidates: SlipCandidate[];
  // Re-reads whatever the native listener has stashed, parses each into a
  // SlipCandidate, and drops (acknowledges) any raw entry that couldn't
  // produce one (no parseable amount) -- those can never be imported anyway,
  // so there's no reason to keep re-surfacing them.
  refresh: () => Promise<void>;
  // Clears one candidate both from native storage and local state. Called
  // for BOTH an explicit dismiss ("Not a payment") and after a successful
  // Confirm import -- the caller (PendingPaymentSheet) decides which, this
  // store only knows "this one is done with".
  acknowledge: (candidateId: string) => Promise<void>;
}

// candidate.id is "notification:<raw id>" (buildNotificationCandidate.ts) --
// the native store only knows the raw id.
function toRawId(candidateId: string): string {
  return candidateId.replace(/^notification:/, "");
}

export const usePendingNotificationCandidateStore = create<PendingNotificationCandidateState>((set, get) => ({
  candidates: [],

  async refresh() {
    const { candidates: raw } = await PaymentNotificationCapture.getPendingCandidates();
    const built: SlipCandidate[] = [];
    for (const item of raw) {
      const candidate = buildNotificationCandidate(item);
      if (candidate) built.push(candidate);
      else await PaymentNotificationCapture.acknowledgeCandidate({ id: item.id });
    }
    set({ candidates: built });
  },

  async acknowledge(candidateId: string) {
    await PaymentNotificationCapture.acknowledgeCandidate({ id: toRawId(candidateId) });
    set({ candidates: get().candidates.filter((c) => c.id !== candidateId) });
  },
}));
