# Deployment

**Last Updated:** 2026-08-02

## Overview

Nexus ships to three targets from one codebase: the web (Vite build + PWA), Android (Capacitor), and desktop (Electron). There is no backend to deploy — Supabase (cloud sync + auth) is a managed third-party service configured entirely via environment variables, not something this repository deploys itself.

## Development Environment

```bash
npm install          # postinstall runs patch-package automatically
npm run dev           # Vite dev server, http://localhost:5173
```

No `.env` file is required to develop — every optional integration (Supabase sync, Sentry) detects its own absence and no-ops. Copy `.env.example` to `.env` only if you want to develop against real sync/error-monitoring locally.

**Desktop, during development:**
```bash
npm run electron:dev  # runs the Vite dev server and Electron together (concurrently)
```

## Production Build

```bash
npm run build          # tsc -b (project-wide type check), then vite build
npm run build:analyze  # same, plus a bundle visualizer (ANALYZE=true, rollup-plugin-visualizer)
npm run preview        # serve the built output locally for a final check
```

`npm run build` is also the first thing CI runs after tests pass (`.github/workflows/ci.yml`), and is a hard gate — a type error or build failure fails the pipeline.

## Deployment Process

### Web
The output of `vite build` (`dist/`) is a static site — deployable to any static host (Vercel, Netlify, Cloudflare Pages, a plain S3+CDN, etc.). `vite-plugin-pwa` registers a service worker (`/sw.js`) **only when running on the actual web target** — explicitly skipped inside the Capacitor native WebView (`main.tsx` checks `Capacitor.isNativePlatform()`), since a fresh APK install already delivers current code and a caching service worker there only risks serving a stale bundle from before the install. This repository does not contain a specific hosting-provider config (no `vercel.json`, no `netlify.toml`) — hosting choice is left to whoever deploys it.

### Android (Capacitor)
```bash
npm run cap:sync    # vite build, then cap sync android (copies web assets + syncs native deps)
npm run cap:open    # opens the android/ project in Android Studio
npm run cap:build   # vite build && cap sync android && cd android && gradlew.bat assembleDebug
```
Produces a debug APK under `android/app/build/outputs/apk/debug/`. App identity: `appId: "com.nexus.app"`, `appName: "Nexus"` (`capacitor.config.ts`). One `patch-package` patch is applied automatically on every `npm install` (`patches/@capgo+capacitor-native-biometric+8.6.2.patch`) — required for biometric unlock to work correctly on-device, see [CHANGELOG.md](CHANGELOG.md) and [SECURITY.md](SECURITY.md). No release/signed-APK pipeline exists in this repository (no keystore config, no Play Store submission automation) — `assembleDebug` only.

### Desktop (Electron)
```bash
npm run electron:preview  # vite build, then launch Electron against the built output
npm run electron:build    # vite build, then package via electron-builder
```
`electron-builder` config lives inline in `package.json`'s `"build"` key: targets `nsis` (Windows installer), `AppImage` (Linux), `dmg` (macOS), output to `release/`. `electron/main.cjs`, `electron/preload.cjs`, `electron/staticServer.cjs` are the three Electron-side files (outside `src/`, not Vite-processed).

### CI/CD
`.github/workflows/ci.yml` runs on every push/PR to `main`: install → lint → type-check → unit/integration tests → build → Playwright install → e2e tests, uploading the Playwright report as an artifact only on failure. **This pipeline verifies the app builds and passes its test suite — it does not deploy anywhere.** There is no CD (continuous deployment) step in this repository; deployment to any target is currently a manual, local operation.

## Environment Variables

All defined in `.env.example`, all optional:

| Variable | Purpose | Effect if unset |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Cloud sync + encryption escrow disabled; app runs fully local-only |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable anon key | Same as above |
| `VITE_SENTRY_DSN` | Sentry error-monitoring endpoint | Error monitoring is a no-op (`initErrorMonitoring()` checks for the DSN's presence) |

Both Supabase variables must be set together for sync to activate (`isSyncConfigured = Boolean(supabaseUrl && supabaseAnonKey)`, `src/lib/supabaseClient.ts`) — setting only one leaves the app in local-only mode, same as setting neither. See [SECURITY.md](SECURITY.md) for what each optional integration actually does once configured.

**Server-side environment (Supabase project, not this repo):** `supabase/schema.sql` must be run once in the target Supabase project's SQL Editor to create the `synced_records` and `user_encryption_keys` tables + RLS policies before sync/encryption will function against that project — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Future Backend Deployment

**Not applicable — no backend exists to deploy.** Supabase is a managed third-party service, configured via the environment variables above, not deployed from this repository. If a real application backend is ever built (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture" and [DECISIONS.md](DECISIONS.md)), it would need its own deployment pipeline, entirely separate from the three client targets documented above.

## Current Status

Web, Android (debug), and Electron (all three OS targets) builds are all fully functional today. CI enforces quality gates on every push/PR but does not deploy.

## Future Improvements

- A signed/release Android build pipeline (currently debug-only).
- Actual CD — automated deployment of the web build to a hosting target on merge to `main`.
- Play Store / App Store submission automation, if native store distribution is ever pursued (see [ROADMAP.md](ROADMAP.md) — no iOS project exists yet at all).
