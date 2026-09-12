import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import LoginScreen from "@/features/sync/components/LoginScreen";
import MfaChallengeScreen from "@/features/sync/components/MfaChallengeScreen";
import EmailVerificationScreen from "@/features/sync/components/EmailVerificationScreen";
import AuthBackdrop from "@/components/ui/AuthBackdrop";
import ErrorState from "@/components/ui/ErrorState";
import { useEntryTranslation } from "@/i18n/useEntryTranslation";
import { allowsLocalOnlyAccess } from "../authAccessPolicy";

interface Props {
  children: ReactNode;
  loginFallback?: ReactNode;
}

// Main and the project hub share this gate and the same Supabase session.
export default function AuthGate({ children, loginFallback }: Props) {
  const { t } = useEntryTranslation();
  const user = useAuthStore((s) => s.user);
  const sessionChecked = useAuthStore((s) => s.sessionChecked);
  const mfaPending = useAuthStore((s) => s.mfaPending);
  const emailVerificationPending = useAuthStore((s) => s.emailVerificationPending);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  if (!isSyncConfigured) {
    return allowsLocalOnlyAccess() ? <>{children}</> : (
      <AuthBackdrop>
        <ErrorState message={t("common.authUnavailable")} onRetry={() => window.location.reload()} />
      </AuthBackdrop>
    );
  }

  if (!sessionChecked) {
    return (
      <AuthBackdrop>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-brand-500" />
      </AuthBackdrop>
    );
  }

  // Route all account challenges to All; the fallback never grants access.
  if (!user && loginFallback) return loginFallback;

  if (!user && mfaPending) {
    return (
      <AuthBackdrop>
        <MfaChallengeScreen />
      </AuthBackdrop>
    );
  }

  if (!user && emailVerificationPending) {
    return (
      <AuthBackdrop>
        <EmailVerificationScreen />
      </AuthBackdrop>
    );
  }

  if (!user) {
    return loginFallback ?? <LoginScreen />;
  }

  return <>{children}</>;
}
