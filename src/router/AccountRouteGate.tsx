import { Navigate, Outlet, useLocation } from "react-router-dom";
import AuthGate from "@/features/sync/components/AuthGate";
import { isHubPath, mainReturnPath } from "@/features/sync/hubEntry";

export default function AccountRouteGate() {
  const location = useLocation();
  const hub = isHubPath(location.pathname);
  const returnTo = hub ? mainReturnPath(new URLSearchParams(location.search).get("returnTo")) : null;
  const loginPath = `/projects?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  return (
    <AuthGate loginFallback={hub ? undefined : <Navigate to={loginPath} replace />}>
      {returnTo ? <Navigate to={returnTo} replace /> : <Outlet />}
    </AuthGate>
  );
}
