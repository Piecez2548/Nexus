import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase, isSyncConfigured } from "@/lib/supabaseClient";
import { runFullSync } from "@/features/sync/syncEngine";

interface AuthState {
  user: User | null;
  initialized: boolean;
  // True once we definitively know whether a session exists — distinct from
  // `initialized`, which flips true synchronously as a re-entrancy guard
  // before the async session check even starts. The auth gate waits on this
  // one so it doesn't flash the login screen before a valid session loads.
  sessionChecked: boolean;
  loading: boolean;
  error: string | null;
  needsEmailConfirmation: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sync: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  sessionChecked: false,
  loading: false,
  error: null,
  needsEmailConfirmation: false,
  syncing: false,
  lastSyncedAt: null,

  async initialize() {
    if (get().initialized) return;
    set({ initialized: true });

    if (!isSyncConfigured || !supabase) {
      set({ sessionChecked: true });
      return;
    }

    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, sessionChecked: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
      if (session?.user) get().sync();
    });

    if (data.session?.user) {
      get().sync();
    }
  },

  async signUp(email, password) {
    if (!supabase) return;

    set({ loading: true, error: null, needsEmailConfirmation: false });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    // With email confirmation enabled on the Supabase project, signUp
    // succeeds but returns no session until the link is clicked.
    if (!data.session) {
      set({ loading: false, needsEmailConfirmation: true });
      return;
    }

    set({ loading: false, user: data.user });
  },

  async signIn(email, password) {
    if (!supabase) return;

    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ loading: false, user: data.user });
  },

  async signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    set({ user: null, lastSyncedAt: null });
  },

  async sync() {
    const { user } = get();
    if (!user) return;

    set({ syncing: true, error: null });

    try {
      await runFullSync(user.id);
      set({ syncing: false, lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      set({ syncing: false, error: err instanceof Error ? err.message : "Sync failed" });
    }
  },
}));
