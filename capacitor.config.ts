import type { CapacitorConfig } from "@capacitor/cli";

// One source, two apps (see src/config/appTarget.ts). The Android application
// id and launcher name come from the Gradle product flavor (android/app/
// build.gradle); these values keep Capacitor's own config in step with the
// target being synced (VITE_APP_TARGET=finance for Nexus Finance).
const finance = process.env.VITE_APP_TARGET === "finance";

const config: CapacitorConfig = {
  appId: finance ? "com.nexus.finance" : "com.nexus.app",
  appName: finance ? "Nexus Finance" : "Nexus",
  webDir: "dist",
  // Capacitor's default ("debug") writes every plugin call and its result to
  // logcat in debug builds, including the app-lock PIN returned by
  // NativeBiometric.getCredentials. Anyone with USB access can read logcat,
  // so bridge logging stays off. Web console output is still visible through
  // WebView remote debugging.
  loggingBehavior: "none",
};

export default config;
