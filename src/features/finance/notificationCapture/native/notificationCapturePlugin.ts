import { registerPlugin } from "@capacitor/core";

// Raw shape stashed by the native listener (PaymentNotificationListenerService.java)
// -- unparsed notification text, exactly as posted by the bank app. Parsing
// into amount/merchant/bank happens JS-side (notificationTextParser.ts).
export interface RawPendingNotification {
  id: string;
  packageName: string;
  title: string;
  text: string;
  bigText: string;
  postedAtMs: number;
}

// Native contract for Payment Notification Capture. Backed by
// PaymentNotificationCapturePlugin.java, the JS-facing companion to the
// always-on PaymentNotificationListenerService -- the listener can only
// alert and stash (Dexie lives in the WebView, native code can't reach it);
// this plugin is how JS checks/opens the special "Notification access"
// grant, flips the capture toggle the listener checks first, and reads/
// clears whatever the listener has stashed.
export interface PaymentNotificationCapturePlugin {
  // Whether the OS-level "Notification access" special grant is currently
  // enabled for this app. No requestAccess() equivalent exists -- Android
  // provides no in-app dialog for this permission category.
  checkAccess(): Promise<{ granted: boolean }>;
  // Opens the system "Notification access" settings screen.
  openAccessSettings(): Promise<void>;
  // The in-app opt-in toggle the native listener checks first, independent
  // of the OS-level grant (both must be true for capture to actually run).
  setCaptureEnabled(options: { enabled: boolean }): Promise<void>;
  isCaptureEnabled(): Promise<{ enabled: boolean }>;
  getPendingCandidates(): Promise<{ candidates: RawPendingNotification[] }>;
  acknowledgeCandidate(options: { id: string }): Promise<void>;
}

export const PaymentNotificationCapture = registerPlugin<PaymentNotificationCapturePlugin>("PaymentNotificationCapture");
