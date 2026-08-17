import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

// Plain window.open()/`<a target="_blank">` silently does nothing on stock
// Capacitor Android -- Capacitor's WebView doesn't implement
// WebChromeClient.onCreateWindow by default (confirmed against this app's
// MainActivity.java, a bare BridgeActivity with no override). @capacitor/
// browser opens the link in the system browser on native instead; web/
// Electron fall back to window.open, which works fine there.
export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
