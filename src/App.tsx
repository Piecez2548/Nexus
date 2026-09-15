import { RouterProvider } from "react-router-dom";
import { router } from "@/router/router";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import UpdateNotice from "@/components/ui/UpdateNotice";
import { usePasswordRecovery } from "@/features/sync/passwordRecovery";
import PasswordRecoveryScreen from "@/features/sync/components/PasswordRecoveryScreen";
import ScreenTutorApp from "@/features/screentutor/ScreenTutorApp";

export default function App() {
  const recovery = usePasswordRecovery((state) => state.active);
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") return <ScreenTutorApp />;
  return <ErrorBoundary>{recovery ? <PasswordRecoveryScreen recovery /> : <RouterProvider router={router} />}<UpdateNotice /></ErrorBoundary>;
}
