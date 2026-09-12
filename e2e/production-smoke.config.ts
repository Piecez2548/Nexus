import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: ".", testMatch: "production-smoke.spec.ts", workers: 1, timeout: 60000, use: { browserName: "chromium", serviceWorkers: "block" } });
