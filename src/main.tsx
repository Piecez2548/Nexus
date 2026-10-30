import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/index.css";
import { ThemeEffect } from "@/providers/ThemeEffect";
import { initErrorMonitoring } from "@/lib/sentry";
import { installStaleChunkReload } from "@/lib/staleChunkReload";

// Account-side startup (audit sink, lock sync, Tools session links) runs from
// accountBoot.ts and default data is seeded by MainRoute, so public pages stay light.
initErrorMonitoring();
installStaleChunkReload();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeEffect />
    <App />
  </React.StrictMode>,
);

// Web only: a caching worker inside the Capacitor WebView would outlive APK updates.
// UpdateNotice asks before reloading when a new version takes control.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void import("@capacitor/core").then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) {
      void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
      return;
    }
    // Devices installed before the native guard can still hold a worker and its
    // Cache Storage across APK updates; remove them so they cannot serve old code.
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });
    if ("caches" in window) {
      void caches.keys().then((names) => {
        for (const name of names) void caches.delete(name);
      });
    }
  });
}
