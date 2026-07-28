import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";

import App from "./App";
import "./styles/index.css";

import { ThemeEffect } from "@/providers/ThemeEffect";
import { seedDatabase } from "@/database/seed";
import { initErrorMonitoring } from "@/lib/sentry";

initErrorMonitoring();

// Only register the PWA service worker on the actual web target. Inside
// the Capacitor WebView, a new APK install already delivers fresh code —
// a caching service worker there only risks serving a stale bundle from
// before the APK was updated (its Cache Storage isn't cleared by an
// install), which is exactly what happened before this guard existed.
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}

async function bootstrap() {
  await seedDatabase();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeEffect />
      <App />
    </React.StrictMode>
  );
}

bootstrap();
