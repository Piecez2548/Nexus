import { defineConfig } from "@playwright/test";
import auth from "./auth-entry.config.js";
export default defineConfig({ ...auth, testMatch: "login.spec.ts", outputDir: "../.impeccable/hardening-login" });
