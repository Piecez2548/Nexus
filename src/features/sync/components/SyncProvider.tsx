import { useEffect } from "react";
import { useAuthStore } from "@/features/sync/store/authStore";

const PERIODIC_SYNC_INTERVAL_MS = 5_000;

// Side-effect-only: initializes the auth session on load, then keeps data
// in sync while the user is signed in — on an interval, and immediately
// whenever the device regains network connectivity. Renders nothing.
export function SyncProvider() {
  useEffect(() => {
    useAuthStore.getState().initialize();

    const interval = setInterval(() => {
      if (useAuthStore.getState().user) {
        useAuthStore.getState().sync();
      }
    }, PERIODIC_SYNC_INTERVAL_MS);

    function handleOnline() {
      if (useAuthStore.getState().user) {
        useAuthStore.getState().sync();
      }
    }

    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
