# Nexus All / Main shared sign-in

Main/All central login deployed on 2026-08-31 with the shared-theme follow-up. See PROJECT_HUB_DEPLOYMENT.md. The sibling Tools entry changes were also deployed with the subsequent neutral-palette release; see PROJECT_HUB_DEPLOYMENT.md.

- `/projects`, `/projects/`, and `/projects/index.html` are now SPA entries behind the existing `AuthGate`, just like `/dashboard` and `/trading`.
- The hub's former public HTML/JavaScript entry has been removed. Its trusted presentation template is bundled under `src/features/projects/`; existing artwork and fonts remain public assets.
- Account sign-in, registration, email confirmation and MFA are presented at All (`/projects`). Anonymous Main routes redirect there with a validated same-origin return path; after login they return to the original Main route. External or hub-loop return destinations are rejected.
- Hub and Main run on the same origin and use the same Supabase client/storage key. Full-page links and reloads restore the same session; there is no second login when a valid session already exists. No credentials are added to URLs, no referrer/query-parameter bypass exists, and no parent-window message is trusted as proof of login.
- Published browser builds fail closed if Supabase configuration is missing. Development, explicit `--mode e2e` builds, and installed Capacitor/Electron wrappers retain local-only support. Never deploy an E2E-mode build to production.
- Supabase's existing authorization/RLS remains the data boundary. Bundled public UI assets are not private data; the UI gate is not a substitute for server authorization.
- All normally omits `AppLockGate`, but explicit account lock adds that gate when a PIN is configured. Main routes mount `AppLockGate`, then `SyncProvider` and `MainLayout`. Same-origin lock generations invalidate older tab sessions and clear in-memory DEKs. Authentication never unlocks the PIN or supplies a DEK.
- Tools accepts the existing nonce/origin/source-checked opener session handoff. Direct visits render local utilities without login or a Main PIN. Account/MFA verification protects optional account/cloud actions; failed verification does not block local utilities and never authorizes private APIs. URL/referrer markers grant no private access.

Vercel canonicalizes the legacy hub document to `/projects`. Service-worker navigation fallback now includes the hub because it is an authenticated SPA route. Hub styles/listeners are removed on unmount so they do not affect login or Main after logout/navigation.

Checks: `npx vitest run src/features/projects/ProjectHub.test.tsx src/features/sync/components/AuthGate src/features/sync/components/LoginScreen.test.tsx src/features/sync/store/authStore.test.ts`; `npx playwright test -c e2e/auth-entry.config.ts`; `npm run build`; `npm run lint`. Authentication browser tests use intercepted synthetic test endpoints, not live customer accounts.

Validation completed: 45 related unit/integration tests and all 8 auth-entry E2E cases passed. The two existing-session cases also passed a desktop/phone screenshot confirmation. Production build (including TypeScript), scoped Oxlint, and scoped ESLint passed. Full-repository Oxlint exits successfully but reports warnings in unrelated installed skill scripts. Concurrent LoginScreen work was preserved; no commit, push, or deployment was performed by this change.

## Account identity in the Home header

The Home header reads the same authenticated user from `useAuthStore`. It displays the registered first/last name, then full name or email as a fallback, alongside a user icon. The account control opens a dropdown with Lock account and Sign out; mobile retains the control with long names truncated visually and the full name in its accessible label. React renders identity text into a header slot without interpolating account data into the trusted HTML template. Session changes update the displayed identity; sign-out remains guarded by AuthGate. Tools remains a separate origin and uses the optional verified SSO handoff described above.

## Central entry validation

Regression coverage includes anonymous Main redirects, All access while Main is PIN-locked, direct Main login followed by PIN, return-to preservation, authenticated Tools SSO, forged URL markers, direct Tools entry, sign-out and MFA enforcement. Existing authenticated sessions may be reused on direct visits; the URL itself does not force reauthentication. Existing local-only wrapper/development support and explicit public media-sharing links are unchanged.
