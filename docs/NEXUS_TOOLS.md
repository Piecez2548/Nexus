# Nexus Tools integration

Implemented 2026-08-31.

- Tools requires a verified account before mounting its tool catalogue. Direct visitors can register, confirm their email OTP, sign in and complete TOTP in Tools. Password recovery and MFA enrollment remain in Nexus.
- Both apps use the same Supabase Auth project. `main.tsx` installs a scoped click handler for the exact Tools home URL, covering Sidebar, MobileMoreMenu and the Nexus All template without changing its presentation.
- A normal click opens a new tab synchronously. An unpredictable 256-bit nonce, exact origin and popup source checks bind a one-use postMessage handshake. Tokens are sent only in the message body, never in URLs; Tools removes the nonce from history and detaches its opener on completion/timeout. Only an authenticated Nexus user can send a session. Tools re-verifies it with Supabase and enforces native MFA assurance before rendering tools.
- Browser-blocked popups, modifier/middle clicks, native wrappers, preview/custom domains or a handshake timeout fall back to direct Tools login. Supported SSO origins are `https://nexus-lemon-eight-32.vercel.app` and `https://nexus-tools-chi.vercel.app`; update and test both allowlists when changing domains. Backup-code-only Nexus MFA sessions still require native TOTP in Tools.
- Sessions persist per origin. Signing out of Tools immediately hides its catalogue and does not sign out of Nexus. This is session handoff, not global single logout. Publicly shared media viewers retain their explicit link/owner/expiry policy; protected API requests independently verify Supabase authorization.
- Tools business books use private Vercel Blob storage scoped by verified user ID, with explicit manual sync and ETag conflict protection. These records do not enter Nexus IndexedDB, synced_records or encryption-key tables; no schema migration is required.
- Tools data is not end-to-end encrypted. Its local data remains after sign-out. A user must confirm before merging local business records into their cloud account.
- Automatic background sync and sharing Tools documents directly into Nexus finance records remain Planned.

Implementation and operational instructions are maintained in `D:\Project_001\Nexus-Tools\README.md`.
