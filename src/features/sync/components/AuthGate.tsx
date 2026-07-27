import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import LoginScreen from "@/features/sync/components/LoginScreen";
import AuthBackdrop from "@/components/ui/AuthBackdrop";

interface Props {
  children: ReactNode;
}

// Requiring sign-in only makes sense when cloud sync is actually configured
// (there's no account system to log into otherwise) — without it, the app
// falls back to its original local-only behavior so it never locks anyone
// out with no way in.
export default function AuthGate({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const sessionChecked = useAuthStore((s) => s.sessionChecked);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  if (!isSyncConfigured) {
    return <>{children}</>;
  }

  if (!sessionChecked) {
    return (
      <AuthBackdrop>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-brand-500" />
      </AuthBackdrop>
    );
  }

  if (!user) {
    return (
      <AuthBackdrop>
        <LoginScreen />
      </AuthBackdrop>
    );
  }

  return <>{children}</>;
}
