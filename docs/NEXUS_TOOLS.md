# Nexus Tools integration

Implemented 2026-08-31.

- Desktop Sidebar and MobileMoreMenu reuse `NexusToolsLink` to open https://nexus-tools-chi.vercel.app/ in a separate tab with `noopener noreferrer`.
- Tools uses the same Supabase Auth project via its public URL/anon-key configuration. Sessions are separate per origin; no access tokens are passed in links.
- Registration, password recovery and MFA enrollment remain in Nexus. Tools supports password sign-in and TOTP verification. Its server verifies tokens with Supabase and requires aal2 when the account has a verified MFA factor.
- Tools business books use private Vercel Blob storage scoped by verified user ID, with explicit manual sync and ETag conflict protection. These records do not enter Nexus IndexedDB, synced_records or encryption-key tables; no schema migration is required.
- Tools data is not end-to-end encrypted. Its local data remains after sign-out. A user must confirm before merging local business records into their cloud account.
- Automatic cross-origin SSO, automatic background sync, and sharing Tools documents directly into Nexus finance records remain Planned.

Implementation and operational instructions are maintained in `D:\Project_001\Nexus-Tools\README.md`.
