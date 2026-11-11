import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  // Optional one-tap action (e.g. "Undo") rendered next to the message.
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (type: ToastType, message: string, options?: { action?: Toast["action"]; durationMs?: number }) => void;
  dismiss: (id: number) => void;
}

const DURATION_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show(type, message, options) {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, type, message, action: options?.action }] });

    setTimeout(() => get().dismiss(id), options?.durationMs ?? DURATION_MS);
  },

  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
