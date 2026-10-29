import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AuthGate from "@/features/sync/components/AuthGate";
import { useAuthStore } from "@/features/sync/store/authStore";
import { isHubPath, mainReturnPath } from "@/features/sync/hubEntry";

export default function AccountRouteGate() {
  const location = useLocation();
  const hub = isHubPath(location.pathname);
  const returnParam = hub ? new URLSearchParams(location.search).get("returnTo") : null;
  // All is public; it becomes the sign-in screen only when Main sent the visitor here.
  if (hub && returnParam === null) return <PublicHub />;
  const returnTo = hub ? mainReturnPath(returnParam) : null;
  const loginPath = `/projects?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  return (
    <AuthGate loginFallback={hub ? undefined : <Navigate to={loginPath} replace />}>
      {returnTo ? <Navigate to={returnTo} replace /> : <Outlet />}
    </AuthGate>
  );
}

// Still restores an existing session so a signed-in visitor sees their account menu.
function PublicHub() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);
  return <Outlet />;
}
