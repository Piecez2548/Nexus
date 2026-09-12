# ACCOUNT-RECOVERY-001 — verification

Date: 2026-09-12

Scope: account-password recovery, escrowed data-key recovery and setting a replacement local PIN. Tests use synthetic accounts, intercepted Supabase endpoints, WebCrypto and isolated test databases. No production account, password, email delivery or user data was changed.

Status: implementation and local verification complete. Subsequently deployed in `ACCOUNT-RECOVERY-DEPLOY-001`; see [production deployment verification](ACCOUNT_RECOVERY_DEPLOYMENT_2026-09-12.md).

## Fixes

- Failed reauthentication now stops recovery even if the auth store retains a previous user. Pending MFA also prevents escrow reads.
- Recovery rejects a different email before sign-in when an account is already known, checks the returned account ID and rejects an account change while the escrow request or unwrap is pending.
- Before replacing the local PIN/key wrap, recovery attempts to decrypt existing encrypted rows across the existing 24-table encryption list, in pages of 200. A wrong/stale key or unreadable envelope leaves the PIN, persisted wrap, ciphertext and session key unchanged. Plaintext rows are ignored; an empty device has no local ciphertext to validate.
- Saving failures are caught and displayed with an enabled retry action. A local key mismatch discards the recovered key and returns to credentials with Thai/English guidance. Error messages use an alert role; successful credential verification clears the password field.

## Evidence

- Related Vitest suite: **35 files / 316 tests passed**, covering encryption, lock, sync/auth, encrypted repositories and backup/restore.
- New recovery regressions cover stale signed-in state after failed authentication, wrong account, pending MFA, account changes during retrieval, provider failure, wrong keys, corrupt ciphertext, ID zero, later tables and rows beyond the first page.
- The data recovery drill starts with a real encrypted local transaction and old PIN, recovers the original key through a mocked escrow service using real cryptography, sets a new PIN, reads the original transaction through its repository and checks the raw ciphertext is unchanged. After locking again, the old PIN fails and the new PIN reads the original data.
- UI tests exercise saving failure followed by a successful retry and local-key mismatch returning to credentials.
- The existing catch-up screen success test was corrected to use ciphertext encrypted with the recovered key; its old placeholder envelope was deliberately not decryptable.
- Password-reset tests also verify that the UI recovery marker does not authorize an update without a session, and that a provider rejection preserves the recovery screen.
- Chromium browser recovery checks: **2/2 passed**, at 390px and 1280px. Both reject another account and wrong credentials without an escrow request, recover a synthetic key, save a new PIN and unlock successfully after reload. The first test run used an incomplete button label; correcting the locator to the actual accessible name resolved the test-only timeout. Screenshots were inspected for the mobile error and desktop PIN-entry states.
- `npm run build:release`: passed, including TypeScript, production build and bundle budget (200 JS chunks, 3708.1 KiB total; largest 454.9 KiB). Final configured lint passed.
- TypeScript and configured lint (`npm run lint`, Oxlint): passed. This checkout has no application ESLint configuration or ESLint/TypeScript parser installation; no separate ESLint pass is claimed.

## Limits and operational recovery

Changing the Supabase account password does **not** automatically rewrap the escrowed data key. Authentication with the new password can succeed while key recovery fails because escrow was wrapped using the old password. On a device that still opens the data, use the existing Settings recovery-key repair action with the current account password, then retry recovery on the locked device. Do not clear the still-working device before recovery is verified.

If no device can supply the original key and the password that wrapped escrow is lost, these changes do not make that encrypted data recoverable. A previously exported portable backup is a separate restore path.

Validation covers ciphertext present locally during recovery, not an atomic snapshot across concurrent devices or an audit of all cloud rows. A corrupt or mixed-key local row blocks replacement conservatively; no data is automatically deleted to bypass that check. Live email-link delivery, production MFA/RLS configuration and physical Android recovery remain unverified by this task. The browser checks emulate mobile viewport width; they are not physical-device tests.

The local evidence above is separate from the subsequent [production deployment](ACCOUNT_RECOVERY_DEPLOYMENT_2026-09-12.md) and [Android packaging/install check](ACCOUNT_RECOVERY_ANDROID_2026-09-12.md). The Android check verified the packaged patch and preserved installation state; it did not perform live account recovery.

## Files changed for this task

- `src/features/encryption/recovery/recoverDekFromEscrow.ts`
- `src/features/encryption/recovery/recoverDekFromEscrow.test.ts`
- `src/features/encryption/recovery/validateRecoveryKey.ts`
- `src/store/appLock/pinLockSlice.ts`
- `src/features/encryption/components/EncryptionRecoveryFlow.tsx`
- `src/features/encryption/components/EncryptionRecoveryFlow.test.tsx`
- `src/features/lock/components/AppLockGate.test.tsx`
- `src/features/sync/passwordRecovery.test.ts`
- `src/i18n/locales/security.ts`
- `e2e/auth-entry.spec.ts`
- This report, `docs/PASSWORD_RECOVERY.md`, `docs/SECURITY.md`, `docs/TESTING_GUIDE.md`, `docs/CHANGELOG.md` and `tasks/TASK_REGISTRY.md`.

Production deployment and Android debug-device installation are complete. Live account recovery still needs a dedicated test account and mailbox, rather than resetting the owner's production credentials.
