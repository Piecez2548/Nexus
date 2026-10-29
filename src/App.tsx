import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("./LegacyApp"));

export default function App() {
  return <Suspense fallback={<div aria-busy="true">Loading workspace…</div>}><LegacyApp /></Suspense>;
}
