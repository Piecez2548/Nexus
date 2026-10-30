import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/index.css";
import { ThemeEffect } from "@/providers/ThemeEffect";

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
    if (Capacitor.isNativePlatform()) return;
    void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
  });
}
