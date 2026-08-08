import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isDevBuild, resolveFlag } from "@/platform/featureFlags";

// Persists feature-flag overrides (PLT-008). `setFlag` overrides a flag,
// `clearFlag` rolls back one to its default, `reset` rolls back all. `isEnabled`
// resolves overrides + experimental/dev gating.
interface FeatureFlagState {
  overrides: Record<string, boolean>;
  setFlag: (id: string, enabled: boolean) => void;
  clearFlag: (id: string) => void;
  reset: () => void;
  isEnabled: (id: string) => boolean;
}

export const useFeatureFlagStore = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      overrides: {},
      setFlag: (id, enabled) => set((state) => ({ overrides: { ...state.overrides, [id]: enabled } })),
      clearFlag: (id) =>
        set((state) => {
          const next = { ...state.overrides };
          delete next[id];
          return { overrides: next };
        }),
      reset: () => set({ overrides: {} }),
      isEnabled: (id) => resolveFlag(id, get().overrides[id], isDevBuild()),
    }),
    { name: "nexus-feature-flags" },
  ),
);
