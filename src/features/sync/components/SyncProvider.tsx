import { useEffect } from "react";
import { useAuthStore } from "@/features/sync/store/authStore";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

const PERIODIC_SYNC_INTERVAL_MS = 5_000;

// Side-effect-only: initializes the auth session on load, then keeps data
// in sync while the user is signed in — from same-account realtime changes,
// on a fallback interval, and whenever connectivity returns. Renders nothing.
export function SyncProvider() {
  useEffect(() => {
    useAuthStore.getState().initialize();

    let realtimeChannel: RealtimeChannel | null = null;
    let subscribedUserId: string | null = null;
    let realtimeSyncQueued = false;

    function triggerSync(queueWhileBusy = false) {
      const { user, syncing, sync } = useAuthStore.getState();
      if (!user) return;
      if (syncing) {
        if (queueWhileBusy) realtimeSyncQueued = true;
        return;
      }

      realtimeSyncQueued = false;
      void sync();
    }

    function subscribeToUser(userId: string | null) {
      if (subscribedUserId === userId) return;

      if (realtimeChannel && supabase) {
        void supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      subscribedUserId = userId;
      if (!supabase || !userId) return;

      realtimeChannel = supabase
        .channel(`nexus-sync:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "synced_records",
            filter: `user_id=eq.${userId}`,
          },
          () => triggerSync(true)
        )
        .subscribe();
    }

    subscribeToUser(useAuthStore.getState().user?.id ?? null);
    const unsubscribeAuth = useAuthStore.subscribe((state) => {
      subscribeToUser(state.user?.id ?? null);
      if (!state.user) {
        realtimeSyncQueued = false;
      } else if (!state.syncing && realtimeSyncQueued) {
        realtimeSyncQueued = false;
        queueMicrotask(() => triggerSync());
      }
    });

    const interval = setInterval(() => {
      triggerSync();
    }, PERIODIC_SYNC_INTERVAL_MS);

    function handleOnline() {
      triggerSync();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      unsubscribeAuth();
      if (realtimeChannel && supabase) {
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  return null;
}
