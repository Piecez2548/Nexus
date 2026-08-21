import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AiCoachSettingsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// Opt-in gate for routing an "unknown"-intent AI Coach question to the real
// Claude LLM fallback (see AiCoachSection.tsx) instead of the static
// "I don't understand" response. Defaults to off: enabling it sends a
// redacted financial summary (see buildCoachLlmContext.ts) to a
// third-party API, and it only ever takes effect when cloud sync is also
// configured and the user is signed in (see AiCoachSection.tsx's
// llmFallbackAvailable).
export const useAiCoachSettingsStore = create<AiCoachSettingsState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "nexus-ai-coach-settings" }
  )
);
