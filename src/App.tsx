import { lazy, Suspense } from "react";
import ScreenTutorApp from "@/features/screentutor/ScreenTutorApp";

const LegacyApp = lazy(() => import("./LegacyApp"));

export default function App() {
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") return <ScreenTutorApp />;
  return <Suspense fallback={<div aria-busy="true">Loading workspace…</div>}><LegacyApp /></Suspense>;
}
