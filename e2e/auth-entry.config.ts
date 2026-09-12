import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "auth-entry.spec.ts",
  workers: 1,
  use: { baseURL: "http://localhost:4175", browserName: "chromium", serviceWorkers: "block" },
  webServer: {
    command: "npx cross-env VITE_SUPABASE_URL=https://nexus-auth-test.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key VITE_SENTRY_DSN= npm run build -- --outDir node_modules/.cache/nexus-auth-test && npm run preview -- --port 4175 --strictPort --outDir node_modules/.cache/nexus-auth-test",
    url: "http://localhost:4175",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
