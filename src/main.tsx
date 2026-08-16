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
} else if (Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  // Defensive one-time cleanup: a device that had this app installed BEFORE
  // the native guard above existed can still have a service worker + its
  // Cache Storage left over -- registrations and Cache Storage persist
  // across `adb install -r`/APK updates (confirmed on a real device: a
  // leftover service worker kept serving an old JS bundle through several
  // subsequent rebuilds, invisible to every WebView-HTTP-cache check, since
  // Cache Storage is a wholly separate persistence layer). Never registered
  // by native builds going forward (the branch above), but any inherited
  // one is actively unregistered so it can't keep intercepting fetches.
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
  if ("caches" in window) {
    void caches.keys().then((names) => {
      for (const name of names) void caches.delete(name);
    });
  }
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
