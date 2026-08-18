# Security

**Last Updated:** 2026-08-18

## Overview

Security in Nexus is layered and mostly **optional-by-design**, matching the local-first philosophy (see [DECISIONS.md](DECISIONS.md)): the app is fully usable with zero security configuration, and each layer below (App Lock, cloud sync auth, encryption-at-rest) activates only once a user opts into it. This document deliberately does not frame Authentication or Encryption as "Future" — both are already implemented — and instead documents what exists today plus the specific, real gaps found.

## Current Security — three independent layers

```
Layer 1 — App Lock (device-local, optional)
  PIN (SHA-256 hash, unstretched) + optional biometric unlock
  Threat model: someone glancing at / picking up an unlocked device

Layer 2 — Cloud sync authentication (optional, requires Supabase configured)
  Supabase email/password only — no OAuth, no magic link, no MFA
  Threat model: unauthorized access to a user's synced cloud data

Layer 3 — Encryption-at-rest (optional, requires Layer 1 + Layer 2)
  Client-side AES-GCM, PBKDF2-derived keys (600,000 iterations)
  Threat model: a compromised or subpoenaed Supabase database
```

These are independent and stackable — a user can run fully local with no lock, local with just a PIN, synced with just Supabase auth, or synced + encrypted. Encryption specifically requires both an App Lock PIN (Layer 1, for day-to-day unlock) and a signed-in Supabase account (Layer 2, for the recovery escrow) to be enabled first.

## Layer 1 — App Lock (`src/features/lock/`)

- **PIN hash:** SHA-256, salted with a random per-installation 16-byte hex salt, **not** stretched with PBKDF2/bcrypt/argon2. This is a deliberate, explicitly-documented choice: `pinHash.ts`'s own comment states this is "a local-only privacy gate (no server, no real authentication)... proportionate against 'someone glancing at the screen' or a shared/borrowed device, not against offline brute-forcing of localStorage contents." **A 4–6 digit PIN protected only by unstretched SHA-256 is not resistant to offline brute force** if an attacker extracts the `nexus-app-lock` localStorage blob — this is a known, accepted tradeoff, not an oversight (see [DECISIONS.md](DECISIONS.md) for why it wasn't made as strong as the DEK's own protection).
- **Biometric unlock:** native-only (Capacitor `@capgo/capacitor-native-biometric`), stores the literal PIN behind a hardware-backed, biometric-gated Android/iOS Keystore credential. Requires **"strong" biometry** specifically (`strongBiometryIsAvailable`, not just `isAvailable`) — checked because weak biometry (some face-unlock implementations) has been observed to crash the crypto-bound `BiometricPrompt`.
- **Auto-lock:** configurable idle timeout (never/5/15/30/60 min), tracked via mouse/keyboard/touch/click activity listeners, checked every 30 seconds. "Remember me" allows skipping the PIN for 7 days, but this **never** substitutes for re-deriving the encryption DEK on a fresh tab — the DEK lives only in memory and is never resurrected from "remember me" state alone, specifically to prevent a reload from silently exposing encrypted data without a real unlock.

## Layer 2 — Cloud Sync Authentication (`src/features/sync/`)

- **Email/password only** — confirmed via `LoginScreen.tsx`: no OAuth/social login, no magic link, no MFA. Minimum password length: 6 characters.
- **Fully optional and gracefully absent:** `AuthGate.tsx` renders the app with **no login screen at all** if Supabase env vars aren't configured (`isSyncConfigured === false`) — a deliberate choice so the app "never locks anyone out with no way in" when sync isn't set up.
- **Access control:** Postgres Row-Level Security (`auth.uid() = user_id`) on both `synced_records` and `user_encryption_keys` — the only access-control mechanism; there is no application-level authorization layer beyond it.

## Layer 3 — Encryption-at-Rest (`src/features/encryption/`)

- **Algorithm:** AES-GCM 256-bit via the browser's native WebCrypto API (`crypto.subtle`) — no third-party crypto library.
- **Key derivation:** PBKDF2-HMAC-SHA256, **600,000 iterations**, explicitly cited in-code as "OWASP's current minimum... 2023 guidance." Two independent KEKs (Key Encryption Keys) can unwrap the same DEK: one derived from the device PIN (day-to-day unlock), one derived from the Supabase account password (recovery escrow).
- **What gets encrypted:** every synced row's business fields, folded into one opaque `encryptedContent` envelope (`{v, iv, ct}`) per row. Two fields deliberately stay plaintext across every table — `recipientProfiles.recipientKey` and `budgets.category` — because they back unique-index database lookups; this is a documented, narrow exception, not a leak.
- **Escrow:** the DEK is wrapped (AES-GCM) under the account-password-derived KEK and stored server-side in `public.user_encryption_keys` — **Supabase never has access to the plaintext DEK**, only its wrapped form, verified against `enableEncryption.ts`'s `escrowDek()` (wraps client-side before upload) and `recoverDekFromEscrow.ts` (unwraps client-side after download).
- **Migration safety:** before encrypting anything, `enableEncryption()` downloads a full **plaintext** backup to the user's own machine first — an explicit disaster-recovery safety net in case the migration itself fails partway.
- **Backups are always plaintext**, regardless of local encryption state — `backupService.ts`'s own comment frames this as intentional: "a portable, human-readable, plaintext disaster-recovery artifact." **This means a backup JSON file is as sensitive as the user's raw financial data and should be handled/stored accordingly** — it is not itself encrypted.

## Validation

Every user input is validated with **Zod schemas** before it reaches a repository — see [CODING_STANDARDS.md](CODING_STANDARDS.md) for the `schema(t: TranslateFn)` factory pattern used consistently across all 12 schema files. Cross-field validation (e.g. a transfer transaction requiring a `toAccount` different from `account`) is handled via `.superRefine()`. There is no server-side re-validation of this data — since there is no server-side business logic at all (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)), client-side Zod validation is the only validation layer that exists, backed only by Postgres RLS for access control (not shape control) on the sync path.

## Data Storage

- **Primary storage:** IndexedDB via Dexie, entirely on-device — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
- **Preferences/session state:** `localStorage`/`sessionStorage` via Zustand's `persist` middleware (language, theme, app-lock state including the PIN hash and wrapped DEK, gamification, dismissed notifications).
- **Cloud (optional):** Supabase Postgres, storing either plaintext or AES-GCM-encrypted JSONB payloads depending on the user's local encryption state, plus the wrapped-DEK escrow row. Server-visible metadata (table names, row counts, timestamps, `user_id`) is **never** encrypted even when the payload is — worth knowing: Supabase can see the shape and cardinality of a user's data even with encryption fully enabled, just not its content.

## Password Handling

There are two distinct "passwords" in this app, handled differently:
- **The App Lock PIN** — never sent anywhere, hashed locally with unstretched SHA-256 (see Layer 1's known limitation above).
- **The Supabase account password** — never touched by app code directly; handled entirely by `@supabase/supabase-js`'s `signUp`/`signIn`/`signInWithPassword` calls against Supabase's own Auth service. The app additionally re-derives a KEK from this password (via PBKDF2) purely client-side for the encryption escrow — the password itself is never stored or transmitted for that purpose, only used momentarily to derive a key in memory.

## Future Authentication

Already implemented: Supabase email/password (see Layer 2). **Not implemented and not currently planned:** OAuth/social sign-in, magic links, multi-factor authentication, or any multi-user/role-based access model — see [ROADMAP.md](ROADMAP.md).

## Future Encryption

Already implemented: enable, escrow, and account-password-based recovery (see Layer 3). **Not implemented:** a "disable encryption" flow — `appLockStore.ts` explicitly blocks turning off the PIN while encryption is enabled, citing the missing disable flow as the reason. This is the most concrete, verified security-related gap in the app today (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

## Gallery Slip Scanner (GS epic)

The scanner is designed to be privacy-preserving and to hold no sensitive financial content at rest:

- **On-device only.** QR decoding (jsQR) and OCR (Tesseract) run entirely in the browser/WebView — slip images are never uploaded. (Tesseract's language-model files may be fetched from a CDN like any npm asset, but no user data is transmitted.)
- **No plaintext financial data persisted.** The scan cache (`slipScanCache`) stores only asset ids, content hashes, and versions; import history (`slipImportHistory`) stores counts/status/duration and a bank id — not slip payloads or amounts as records to mine. Imported transactions live in the normal (optionally-encrypted) `transactions` table via the existing `transactionService`.
- **Integrity + tamper detection.** EMVCo payloads are checksum-verified (CRC-16, GS-010); the tamper-detection layer (GS-017) flags CRC mismatches and replayed (duplicate) QR slips.
- **Audit trail.** Permission changes, imports, deletions, failed validations, and suspicious activity (GS-017/GS-038) all record into the app-wide, persisted Audit Log — see its own section below.
- **Secure disposal.** Decoded image bytes are zero-filled and thumbnail object-URLs revoked after use (GS-017), so slip pixels don't linger in memory.
- **AI never mutates data.** The validation/AI layers (GS-019, GS-041) are advisory only — they never modify imported transactions automatically.

## Payment Notification Capture

A `NotificationListenerService` (`PaymentNotificationListenerService.java`), when granted, can technically read the content of *every* notification posted on the device by *any* app — a materially broader surface than the gallery scanner's own-photos-only model above. Nexus limits what it actually does with that access:

- **Allowlist-gated.** Notifications from any package not on a small, hardcoded bank/payment-app list (Phase 1: SCB Easy, K PLUS, Krungthai NEXT, เป๋าตัง/Pao Tang) are discarded inside `onNotificationPosted`, before storage or logging, unconditionally — content from any other app (WhatsApp, LINE, email, etc.) never enters this code path at all.
- **Opt-in twice over.** Requires both the OS-level "Notification Access" special grant (manual, in system Settings — Android gives no in-app prompt for this permission category) *and* an in-app Settings toggle, checked first by the listener, which is a fast no-op when off.
- **Never auto-creates a transaction.** The listener can only stash a small pending record (SharedPreferences, bounded ring buffer) and show its own "tap to confirm" notification; the Dexie write happens only after an explicit in-app "Confirm" tap, through the same Smart Import pipeline every other import path uses. Native code never touches Dexie directly — it structurally can't (Dexie lives in the WebView's JS engine).
- **No raw content in audit logs.** Audit events record bank id / field-presence booleans, never notification text — the same metadata-only discipline the Gallery Scanner's audit log already follows.
- **Known gap.** Unlike the gallery scanner (own photos only), this technically has OS-level visibility into notifications from any app on the device, bounded only by the in-code allowlist — a compromised build could in principle be changed to read anything. This is a trust boundary the user should understand before enabling it (the in-app explanation shown before sending them to system Settings says so plainly).
- **Known duplicate-detection limitation.** A payment confirmed via notification and the same payment later re-captured by a gallery scan (e.g. a screenshot of the same transaction) may not be auto-skipped as a duplicate — bank notifications rarely carry a parseable reference number, and without one the conflict resolver's amount+merchant+timestamp signal alone falls just under its auto-skip threshold (proven in `smartImport.test.ts`). Both would then appear as separate transactions pending manual cleanup. See this feature's task-registry entry for status. (`smartDuplicate.ts`'s timestamp signal now bridges a date-only timestamp against a date+time one on the same calendar day — narrower than it sounds: three weak signals still can't mathematically reach the 0.85 auto-skip threshold on their own, so this remains a real, accepted limitation, not resolved.)

## Vault

A password manager / secure notes / recovery-key store (`src/features/vault/`) — the one place in this app where encryption is mandatory, not opt-in hardening:

- **Always encrypted, by construction.** Every table in this app uses the same `createEncryptedRepository` (Layer 3 above), which silently writes plaintext if the device-wide encryption toggle is off — correct for other tables, wrong for a password vault. `Vault.tsx` closes that gap at the route level: the entire page (list, add, edit) is inaccessible unless `encryptionEnabled` is true, showing the existing "Enable Encryption" flow instead of a vault when it isn't. This makes "Vault is usable" and "encryption is on" equivalent for this feature specifically, without changing `encryptedRepository.ts`'s behavior for every other table.
- **No separate recovery path.** Vault entries are encrypted with the same DEK as everything else, recoverable only through the same account-sign-in `EncryptionRecoveryFlow` described in Layer 3 — there is no vault-specific backup or reset. Losing both the PIN and the ability to sign into the linked account means the vault (like the rest of the app's encrypted data) is unrecoverable.
- **Nothing stays plaintext, not even the title.** Unlike `recipientProfiles`/`budgets` (which keep one low-sensitivity field outside `encryptedContent` for a Dexie index lookup), `vaultEntryRepository.ts` passes no `plaintextKeys` — every field, including the entry's title, folds into the encrypted envelope.
- **Syncs like everything else.** Vault entries push/pull through the same generic `synced_records` relay as every other table (see Layer 2/3 above and `syncEngine.test.ts`'s opaque-blob tests) — safe because the content is already ciphertext before the sync engine ever touches it, not because sync treats Vault specially.
- **Clipboard exposure, stated plainly.** Copying a password/recovery code uses the standard OS clipboard (`navigator.clipboard.writeText`) — like virtually every password manager, this means the secret is briefly available to any other app that reads the clipboard on that device. No auto-clear-after-N-seconds is implemented; a deliberate, documented gap, not an oversight.

## Workout Tracker

A rep/time/calorie logger with an optional GPS route-tracking mode (`src/features/workouts/`) — the app's first feature requesting device location.

- **Foreground-only GPS, by design.** `useGpsTracker.ts` calls `@capacitor/geolocation`'s `watchPosition` only while its owning component is mounted, and explicitly clears the watch on unmount, pause, and stop. No background-location permission (Android's "Allow all the time") is ever requested, no foreground service, no persistent tracking notification — closing the app or navigating away stops recording. This is a deliberate scope cut, not a missing feature: background location is a materially bigger permission ask (subject to its own Play Store policy justification) for a feature that doesn't need it.
- **Standard runtime permission, not a special grant.** Unlike Payment Notification Capture's "Notification Access" (no in-app request dialog exists for that category), location is a normal Android runtime permission — `Geolocation.requestPermissions()` shows the standard system dialog directly.
- **Route data syncs like everything else, and is not treated as sensitive.** GPS route points (lat/lng/timestamp) live inline on the `workoutEntries` row and push/pull through the same generic `synced_records` relay as every other table. Unlike Vault, workout data is not always-encrypted — it follows the same opt-in `encryptedRepository` behavior as most of the app (Layer 3): encrypted at rest if the user has turned encryption on, plaintext otherwise. A user who wants their workout routes protected needs to enable that setting like they would for any other table.
- **Calorie figures are user-set estimates, not derived from any sensor.** `caloriesPerMinute`/`caloriesPerRep`/`caloriesPerKm` are plain numbers the user enters on a catalog exercise; nothing in this feature reads heart rate, weight, or any health sensor. No `HEALTH_CONNECT`/fitness-data permission is requested or needed.
- **YouTube demo links open externally, never embedded.** "Watch demo" opens a URL via `@capacitor/browser` (system browser on native) or `window.open` on web — no `<iframe>` embed, no YouTube script/SDK loaded into the app's own WebView.

## Audit Log (`src/features/security/`)

An app-wide, persisted, bounded, metadata-only security audit trail (SEC-002) — viewable in Settings > Security & Sync > Audit Log:

- **Relocated and widened, not new from scratch.** The mechanism (bounded ring buffer, injectable sink, `recordAudit(type, action, detail)`) previously lived scanner-scoped at `slipScanner/security/scanAuditLog.ts` — it moved to `src/features/security/auditLog.ts` and its event-type union widened from the original six scanner categories (`permission`/`import`/`scan`/`delete`/`validation`/`suspicious`) to also cover `auth`, `encryption`, `lock`, `vault`, and `backup`. No production code called it before this — it was scaffolding with tests but no real callers or persistence.
- **Now actually persisted.** The injectable sink (designed for exactly this from the start, per the module's own original comment) is wired at app bootstrap (`main.tsx`) to `dexieAuditSink.ts`, which writes every event to a new local-only (unsynced) Dexie table, bounded at 500 rows (oldest trimmed first) — independent of, and larger than, the 200-event in-memory cap, since persistence changes the retention tradeoff.
- **What's actually recorded today:** sign-in/sign-up/sign-out (success/failure only, never the email or password — `authStore.ts`), encryption enabled/re-escrowed (`enableEncryption.ts`/`reescrowDek.ts`), PIN setup/changed/disabled and biometric enabled/disabled (`appLockStore.ts`), **failed unlock attempts specifically** — the classic audit signal — while routine successful unlocks are deliberately not logged (they'd fire many times a day and add noise, not signal), Vault entry created/updated/deleted (entry *type* only, never title/username/password/content — `vaultEntryStore.ts`), and backup exported/imported/reset (`backupService.ts`). The scanner's own original event types (`permission`/`import`/`scan`/`delete`/`validation`/`suspicious`) are wired at the mechanism level but, as before this change, have no production call sites yet — that remains separate, not-yet-done work.
- **Read-only, local, and clearable.** The Settings drawer only ever reads and optionally clears the log — nothing in the app queries it to make decisions, so a cleared or disabled log never changes app behavior, only observability.

## Permission Manager (`src/features/security/permissions/`)

A single dedicated view of every OS-level permission the app can request (SEC-001) — viewable in Settings > Security & Sync > Permission Manager. Before this, each feature checked/requested its own permission inline with no shared view.

- **Four permission surfaces, unified into one status list** — `permissionManagerService.ts`'s `listPermissions()` calls into the existing, already-built check functions for each (reused, not reimplemented) and normalizes every result onto the Gallery Scanner's own 6-value status union (`granted`/`limited`/`prompt`/`denied`/`blocked`/`unavailable`), which already covered every state any of the four can be in: Gallery/Photos (`galleryPermissionService.ts`, used by the Gallery Slip Scanner), Location (`@capacitor/geolocation`, used by Workout Tracker GPS), Local Notifications (`@capacitor/local-notifications`, used by Habit/Schedule/Subscription reminders), and Notification Access (`PaymentNotificationCapture.checkAccess()`, used by Payment Notification Capture) — the one special-access grant with no in-app request dialog at all.
- **Camera and biometric deliberately excluded.** The app only ever uses the OS photo picker (`Camera.pickImages()`, permission-less on modern Android), never a live capture flow, so there is no separate Camera runtime grant to manage. Biometric is a capability/enrollment check already surfaced in `SecuritySettings.tsx`, not an OS "grant" in the same sense as the four above — including it here would duplicate, not centralize.
- **A genuinely new, minimal native capability**: no generic "open this app's system Settings screen" mechanism existed anywhere in this codebase before this task (`useGalleryPermission.ts`'s own long-standing code comment described the intended "denied → open Settings → recheck" shape, but nothing ever backed it natively) — without it, a permanently-denied ("blocked") Gallery/Location/Local-Notifications permission would be a dead end with no in-app recovery, undermining the "managing" half of this feature's own purpose. `AppSettingsPlugin.java` (`android/app/src/main/java/com/nexus/app/settings/`) adds one `open()` method firing `Settings.ACTION_APPLICATION_DETAILS_SETTINGS`, mirroring `PaymentNotificationCapturePlugin.java`'s existing single-purpose `openAccessSettings()` exactly. Notification Access keeps using its own dedicated method (a different Settings screen); the new generic one is only used for the other three.
- **A plain check() can't distinguish "denied" from "permanently blocked" on Android** — only a request's before/after comparison can (the OS silently declines to show the dialog again once permanently denied). `permissionManagerService.ts` reuses `galleryPermissionService.ts`'s exact established technique for Location and Local Notifications, so `"blocked"` only ever appears as the *result* of an attempted request, never from a passive status check — the same limitation the pre-existing gallery code already lives with.
- **No revocation.** Android provides no API for an app to revoke its own already-granted permission — Request and Open Settings (native "app info" screen) are the only two actions this feature offers, matching what the OS actually allows.

## Security Recommendations

- Build the missing "disable encryption" flow, or at minimum document the manual export/reset/re-import workaround clearly in-app.
- Consider whether the PIN hash's threat model documentation should be surfaced to end users (e.g. in Settings copy), so a user who assumes PIN = "encryption-grade security" isn't misled.
- Consolidate `PLAINTEXT_KEYS` (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)) so which fields bypass encryption is defined once, not hand-synchronized across three files — a drift here would be a silent data-exposure bug.
- If the AI Gateway (`src/ai/`) is ever wired to a real remote LLM provider, an API key must be proxied through a backend rather than embedded client-side — this is already correctly identified as a blocker in the codebase's own design (see [DECISIONS.md](DECISIONS.md)), just flagged here as a hard requirement, not a nice-to-have.
- Wire the Gallery Scanner's own original audit event types (permission/import/scan/delete/validation/suspicious) into their real call sites — the mechanism and persistence are both real now, but nothing in the scanner actually calls `recordAudit` yet, same as before this Audit Log work.

## Current Status

All three security layers are fully implemented and independently optional. The one confirmed functional gap is the missing "disable encryption" flow.

## Future Improvements

See "Future Authentication," "Future Encryption," and "Security Recommendations" above.
