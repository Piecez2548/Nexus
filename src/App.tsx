import { lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import ScreenTutorApp from "@/features/screentutor/ScreenTutorApp";
import { shouldOpenScreenTutor } from "@/appEntry";

const LegacyApp = lazy(() => import("./LegacyApp"));

export default function App() {
  if (shouldOpenScreenTutor(window.location.pathname, Capacitor.isNativePlatform())) return <ScreenTutorApp />;
  return <Suspense fallback={<div aria-busy="true">Loading workspace…</div>}><LegacyApp /></Suspense>;
}
