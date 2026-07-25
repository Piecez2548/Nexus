import { create } from "zustand";

// Deliberately NOT persisted (no zustand/middleware persist here) — the
// decrypted DEK must never survive a closed tab or a page reload, otherwise
// storing it anywhere durable would defeat the point of not persisting it
// in the first place. It's set once per tab, at unlock or recovery time,
// and cleared on lock/sign-out.
interface EncryptionSessionState {
  dek: CryptoKey | null;
  setDek: (dek: CryptoKey | null) => void;
  clearDek: () => void;
}

export const useEncryptionSessionStore = create<EncryptionSessionState>((set) => ({
  dek: null,
  setDek: (dek) => set({ dek }),
  clearDek: () => set({ dek: null }),
}));
