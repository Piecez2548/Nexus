import { registerPlugin } from "@capacitor/core";

// Backed by AppSettingsPlugin.java -- opens this app's generic system
// "App info" Settings screen. The one recovery path for a permission that's
// been permanently denied ("blocked"), which Android provides no in-app
// re-request dialog for at all.
export interface AppSettingsPlugin {
  open(): Promise<void>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>("AppSettings");
