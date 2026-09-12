import authConfig from "./auth-entry.config.js";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...authConfig,
  testMatch: "project-hub.spec.ts",
  outputDir: "../.impeccable/project-hub-results",
});
