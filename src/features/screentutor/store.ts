import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, HistoryEntry, ScreenRegion } from "./types";

interface ScreenTutorState {
  settings: AppSettings;
  region: ScreenRegion | null;
  history: HistoryEntry[];
  setSettings: (settings: Partial<AppSettings>) => void;
  setRegion: (region: ScreenRegion | null) => void;
  addHistory: (entry: HistoryEntry) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

const defaults: AppSettings = {
  ollamaUrl: "http://127.0.0.1:11434",
  model: "",
  temperature: 0.2,
  ocrLanguage: "tha+eng",
  learningMode: "explain",
  hotkey: "Ctrl + Shift + Space",
  storeHistory: true,
  developerMode: false,
  theme: "system",
};

export const useScreenTutorStore = create<ScreenTutorState>()(
  persist(
    (set) => ({
      settings: defaults,
      region: null,
      history: [],
      setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      setRegion: (region) => set({ region }),
      addHistory: (entry) => set((state) => ({ history: [entry, ...state.history].slice(0, 100) })),
      deleteHistory: (id) => set((state) => ({ history: state.history.filter((entry) => entry.id !== id) })),
      clearHistory: () => set({ history: [] }),
    }),
    { name: "screentutor-settings" },
  ),
);
