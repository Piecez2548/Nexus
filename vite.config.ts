import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Opt-in only (npm run build:analyze) — normal builds shouldn't pay the
    // extra build time or ship a stats.html nobody asked for.
    Boolean(process.env.ANALYZE) && visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
    VitePWA({
      registerType: "autoUpdate",
      // Registered manually in main.tsx, gated on !Capacitor.isNativePlatform().
      // The wrapped Android app already gets fresh code on every APK
      // install — a caching service worker inside that WebView adds no
      // value and is a real liability: its Cache Storage survives `adb
      // install -r` (and a normal user's app update), so it can silently
      // keep serving a stale, already-fixed JS bundle indefinitely.
      injectRegister: false,
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Nexus - Life Operating System",
        short_name: "Nexus",
        description: "Local-first finance, trading, and life tracking — all on your device.",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});