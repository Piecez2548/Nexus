# Password recovery

The sign-in screen links to `/forgot-password`. The form requests a Supabase recovery email using the existing site origin as redirect target. Configure the production origin in Supabase Auth URL Configuration and keep the Site URL on the production Nexus domain.

A module-level PASSWORD_RECOVERY subscription captures recovery before React mounts. The recovery view replaces the router until completion or cancellation. A sessionStorage flag preserves the view across reloads; it does not authorize account access. Updating a password requires a valid Supabase session and remains subject to server password policy and MFA requirements.

The form requires at least eight characters and matching confirmation. Missing/expired sessions and provider failures are shown without claiming success. No password or token is logged or stored by this feature. A successful request uses neutral wording and does not disclose account existence. Users initiate email sending themselves.

Automated tests cover request parameters, provider errors, password validation, expired sessions, authenticated updates and the recovery event. Live email delivery and clicking the one-time recovery link require a user-controlled mailbox and were not performed automatically.

Account-password reset and encrypted-data recovery are separate. Resetting the account password does not rewrap its escrowed data key. If encryption recovery fails after a password reset, unlock a device that can still read the original data and use Settings' recovery-key repair action with the current account password. Then retry on the locked device. If neither the original key nor the password that wrapped escrow is available, account access alone cannot decrypt the old data; a previously exported portable backup is a separate restore option.

PIN recovery rejects failed reauthentication and mismatched accounts. Before saving a new PIN it checks that the recovered key decrypts existing local ciphertext. Failure leaves the local PIN/key wrap unchanged and displays a retry or key-repair message. See [account recovery verification](ACCOUNT_RECOVERY_VERIFICATION_2026-09-12.md) for coverage and limitations.
