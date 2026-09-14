import { Capacitor } from "@capacitor/core";
import { NativeBiometric, AccessControl } from "@capgo/capacitor-native-biometric";

import { translate } from "@/i18n/useTranslation";

// Reuses the Capacitor appId (capacitor.config.ts) as the credential
// "server" — this app only ever stores a single credential (the App Lock
// PIN), so a fixed, app-scoped identifier is all that's needed.
const CREDENTIAL_SERVER = "com.nexus.app";
const CREDENTIAL_USERNAME = "nexus-app-lock-pin";
// Some Android 16/OEM biometric providers authenticate successfully but do
// not return a usable CryptoObject for per-operation cipher mode. A short
// validity window lets the native bridge authenticate first, then perform the
// cipher operation immediately after the prompt without weakening the
// biometric gate for later app unlocks.
const ANDROID_AUTH_VALIDITY_SECONDS = 5;
const ANDROID_COMPATIBILITY_ERROR_MARKERS = [
  "Keystore operation failed",
  "Biometric crypto object unavailable",
  "Failed to encrypt credentials",
  "Failed to decrypt credentials",
];

function isAndroidCompatibilityError(error: unknown): boolean {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : String(error ?? "");
  return ANDROID_COMPATIBILITY_ERROR_MARKERS.some((marker) => message.includes(marker));
}

const biometricPromptOptions = {
  reason: translate("lock.biometricPromptReason"),
  title: translate("lock.biometricPromptTitle"),
  subtitle: translate("lock.biometricPromptSubtitle"),
};

// Some OEM Keymasters (including the connected vivo V2348) report a successful
// fingerprint prompt but keep a validity-window key unauthenticated. The
// plugin's AccessControl.NONE branch still encrypts the value with an
// Android Keystore key; we use it only as a compatibility fallback and run a
// fresh OS biometric verification immediately before every read/write.
async function runAndroidCompatibilityFallback(pin?: string): Promise<string | null> {
  await NativeBiometric.verifyIdentity(biometricPromptOptions);

  if (pin !== undefined) {
    await NativeBiometric.setCredentials({
      username: CREDENTIAL_USERNAME,
      password: pin,
      server: CREDENTIAL_SERVER,
      accessControl: AccessControl.NONE,
    });
    return null;
  }

  const credentials = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
  return credentials.password;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    // No `useFallback` — this must reflect real biometric hardware only,
    // since the Settings UI explicitly says "fingerprint". Passing
    // useFallback:true would also count a bare device PIN/pattern as
    // "available" on Android, which would be misleading here.
    //
    // `isAvailable` alone is NOT enough: Android reports it true even for
    // weak-only biometry (e.g. some face unlock), which is fine for a
    // plain verifyIdentity() gate but crashes the crypto-bound
    // BiometricPrompt that storeBiometricCredential/retrieveBiometricPin
    // actually use (androidx.biometric throws IllegalArgumentException:
    // "Crypto-based authentication is not supported for Class 2 (Weak)
    // biometrics" — an uncaught native exception that takes the whole app
    // down, confirmed on-device). strongBiometryIsAvailable is the field
    // that actually reflects what our crypto-bound flow needs.
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable && result.strongBiometryIsAvailable;
  } catch {
    return false;
  }
}

// Reconciles the persisted web flag with the native credential store after an
// APK/web-asset update. This does not read or decrypt the PIN and therefore
// does not show a biometric prompt. Availability is deliberately not part of
// this check: Android can report a sensor temporarily unavailable (lockout,
// resume race, or an interrupted prompt) while the protected credential is
// still valid. Hiding the credential in that window strands the user on the
// PIN form until the next app restart.
export async function hasBiometricCredential(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const saved = await NativeBiometric.isCredentialsSaved({ server: CREDENTIAL_SERVER });
    return saved.isSaved;
  } catch {
    return false;
  }
}

// Stores `pin` (the App Lock PIN's literal plaintext) behind a
// hardware-backed, biometric-gated Keystore key. BIOMETRY_ANY (not
// BIOMETRY_CURRENT_SET) so enrolling an *additional* fingerprint doesn't
// invalidate the stored credential — only removing/replacing biometrics
// entirely does. OEMs that cannot unlock a validity-window key fall back to
// the plugin's encrypted AccessControl.NONE store after a separate prompt.
export async function storeBiometricCredential(pin: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await NativeBiometric.setCredentials({
      username: CREDENTIAL_USERNAME,
      password: pin,
      server: CREDENTIAL_SERVER,
      accessControl: AccessControl.BIOMETRY_ANY,
      authValidityDuration: ANDROID_AUTH_VALIDITY_SECONDS,
    });
  } catch (error) {
    if (!isAndroidCompatibilityError(error)) throw error;
    await runAndroidCompatibilityFallback(pin);
  }
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

// Shows the OS biometric prompt and decrypts the stored PIN. The normal path
// is the OS-enforced secure credential operation. A compatibility device may
// reject the post-prompt Keystore operation; in that case we require a fresh
// verifyIdentity prompt before reading the plugin's encrypted fallback store.
// Returns null for every "not right now" case (cancelled, failed scan,
// lockout, no credential stored, unavailable) — callers fall back to the
// always-visible PIN field silently, with no error shown.
export async function retrieveBiometricPin(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const credentials = await NativeBiometric.getSecureCredentials({
      server: CREDENTIAL_SERVER,
      ...biometricPromptOptions,
    });
    return credentials.password;
  } catch (error) {
    if (!isAndroidCompatibilityError(error) && !String(error ?? "").includes("No protected credentials found")) {
      return null;
    }

    try {
      return await runAndroidCompatibilityFallback();
    } catch {
      return null;
    }
  }
}
