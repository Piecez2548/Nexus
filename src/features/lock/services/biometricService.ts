import { Capacitor } from "@capacitor/core";
import { NativeBiometric, AccessControl } from "@capgo/capacitor-native-biometric";

import { translate } from "@/i18n/useTranslation";

// Reuses the Capacitor appId (capacitor.config.ts) as the credential
// "server" — this app only ever stores a single credential (the App Lock
// PIN), so a fixed, app-scoped identifier is all that's needed.
const CREDENTIAL_SERVER = "com.nexus.app";
const CREDENTIAL_USERNAME = "nexus-app-lock-pin";

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    // No `useFallback` — this must reflect real biometric hardware only,
    // since the Settings UI explicitly says "fingerprint". Passing
    // useFallback:true would also count a bare device PIN/pattern as
    // "available" on Android, which would be misleading here.
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

// Stores `pin` (the App Lock PIN's literal plaintext) behind a
// hardware-backed, biometric-gated Keystore key. BIOMETRY_ANY (not
// BIOMETRY_CURRENT_SET) so enrolling an *additional* fingerprint doesn't
// invalidate the stored credential — only removing/replacing biometrics
// entirely does.
export async function storeBiometricCredential(pin: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await NativeBiometric.setCredentials({
    username: CREDENTIAL_USERNAME,
    password: pin,
    server: CREDENTIAL_SERVER,
    accessControl: AccessControl.BIOMETRY_ANY,
  });
}

export async function deleteBiometricCredential(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await NativeBiometric.deleteCredentials({ server: CREDENTIAL_SERVER });
  } catch {
    // Nothing to delete (never enabled, or already cleared) — every caller
    // treats "disabled" as the end state regardless, so this is never
    // worth surfacing as an error.
  }
}

// Shows the OS biometric prompt and decrypts the stored PIN as a single,
// OS-enforced operation (getSecureCredentials, bound via accessControl at
// write time) — not a plain getCredentials() preceded by an app-level
// verifyIdentity() call, which the OS does not actually tie together.
// Returns null for every "not right now" case (cancelled, failed scan,
// lockout, no credential stored, unavailable) — callers fall back to the
// always-visible PIN field silently, with no error shown; only a
// genuinely unexpected failure *after* a successful decrypt (e.g. the
// caller's own unlock() rejecting) should ever surface an error.
export async function retrieveBiometricPin(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const credentials = await NativeBiometric.getSecureCredentials({
      server: CREDENTIAL_SERVER,
      reason: translate("lock.biometricPromptReason"),
      title: translate("lock.biometricPromptTitle"),
      subtitle: translate("lock.biometricPromptSubtitle"),
    });
    return credentials.password;
  } catch {
    return null;
  }
}
