import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexus.app",
  appName: "Nexus",
  webDir: "dist",
  // Capacitor's default ("debug") writes every plugin call and its result to
  // logcat in debug builds, including the app-lock PIN returned by
  // NativeBiometric.getCredentials. Anyone with USB access can read logcat,
  // so bridge logging stays off. Web console output is still visible through
  // WebView remote debugging.
  loggingBehavior: "none",
};

export default config;
