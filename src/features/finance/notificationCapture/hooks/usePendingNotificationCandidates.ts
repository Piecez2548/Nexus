import { useEffect } from "react";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { usePendingNotificationCandidateStore } from "../store/pendingNotificationCandidateStore";

export interface UsePendingNotificationCandidates {
  candidates: SlipCandidate[];
  acknowledge: (candidateId: string) => Promise<void>;
}

// Refreshes on mount AND on every app resume -- a mount-only check would miss
// a "warm" tap (app already running in the background when the user taps our
// notification; Android resumes the existing activity, no remount happens).
// Gated on isNativePlatform() like nativeReminderService.ts: the native
// listener/plugin this depends on doesn't exist on web.
export function usePendingNotificationCandidates(): UsePendingNotificationCandidates {
  const candidates = usePendingNotificationCandidateStore((s) => s.candidates);
  const refresh = usePendingNotificationCandidateStore((s) => s.refresh);
  const acknowledge = usePendingNotificationCandidateStore((s) => s.acknowledge);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void refresh();

    const listenerPromise = App.addListener("resume", () => {
      void refresh();
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh/acknowledge are stable zustand actions
  }, []);

  return { candidates, acknowledge };
}
