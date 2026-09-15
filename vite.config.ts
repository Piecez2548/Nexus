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
      // The project hub now shares the SPA's authenticated session gate.
      workbox: {
        // Manual registration does not send Workbox's SKIP_WAITING message.
        skipWaiting: true,
        clientsClaim: true,
        // Prefer the deployed HTML shell; retain the precached shell offline.
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin,
          handler: "NetworkFirst",
          options: {
            cacheName: "nexus-navigation-v1",
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 10 },
            precacheFallback: { fallbackURL: "/index.html" },
          },
        }],
      },
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "ScreenTutor — See. Understand. Learn.",
        short_name: "ScreenTutor",
        description: "A private, local-first screen learning assistant.",
        theme_color: "#f5f7f4",
        background_color: "#f5f7f4",
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
  build: {
    rolldownOptions: {
      output: {
        // Keep the entry chunk focused on Nexus bootstrap code. These are
        // stable, independently-cacheable runtime families that the bundle
        // analyzer showed dominating the shared entry chunk; grouping them
        // changes packaging only, not the app's import or execution order.
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "vendor-router",
              test: /node_modules[\\/]react-router(?:-dom)?[\\/]/,
            },
            {
              name: "vendor-motion",
              test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
            },
            {
              name: "vendor-cloud",
              test: /node_modules[\\/](@supabase|iceberg-js)[\\/]/,
            },
            {
              name: "vendor-monitoring",
              test: /node_modules[\\/]@sentry[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    maxWorkers: 4,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
