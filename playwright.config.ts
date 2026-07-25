import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    // The app defaults to Thai (its primary audience), but every existing
    // spec asserts on English UI text — pre-seed the language toggle's
    // localStorage key so tests don't need their own per-file override.
    storageState: "./e2e/storageState.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Force-unset the Supabase vars for this build regardless of what a
    // developer's local .env.local has configured, so the login gate never
    // triggers here — every existing spec assumes it's already "inside" the
    // app. The gate itself (spinner -> login form -> authenticated content)
    // is covered by AuthGate.test.tsx/LoginScreen.test.tsx with a mocked
    // Supabase client instead of a real network round-trip in E2E.
    command:
      "cross-env VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build && npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
