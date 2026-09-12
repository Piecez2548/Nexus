# Project hub deployment

## Production hardening deployment (2026-09-09)

- Nexus All/Main: `dpl_BZkReB55ATVkS3dmLcTnZHpf6jGg` → https://nexus-lemon-eight-32.vercel.app
- Nexus Tools: `dpl_EPu5Kjcc4eG2TRbfBAjPrxNH4phQ` → https://nexus-tools-chi.vercel.app
- DataLens remains `dpl_88vRJpym3LkSDpXAnYEeAdSEtxpz` → https://datalens-kappa-one.vercel.app
- Production smoke passed 2/2, including anonymous gates, shared security headers, public Tools access with private APIs, DataLens authentication, and a 2.5-second mobile cold-login budget.
- Production Supabase migration history now matches all five local migrations, including server-side MFA backup-code redemption; `supabase db push --linked --dry-run` reports no pending database changes.
- Android debug APK built successfully with JDK 21 and a short Windows temporary path, verified with APK Signature Scheme v2, and installed in-place on device `V2348` while preserving app data. Use `npm run cap:build:windows` for repeatable builds.
- Latest debug APK SHA-256: `AD9AD66C4D443BCC7434CF70D219E6F3857A4434F4FA335B1B653305AB5B8B29`; package `com.nexus.app`, version `1.0` (`versionCode` 1), last installed on device `V2348` at `2026-09-09 01:29:31`.

## Executive-readiness production release (2026-09-08)

Main/All READY: `dpl_H4sB9aTMVoxqPzXYjkzKz7nQt38F` → https://nexus-lemon-eight-32.vercel.app (immutable: https://nexus-hi5hnkxqe-piecez2548s-projects.vercel.app). Vercel now runs `build:release`, so TypeScript, Vite production build and the JavaScript bundle budget are all production deployment gates. Tools remains available at https://nexus-tools-chi.vercel.app and passed the public-workspace/API-protection smoke check.

Production smoke passed 2/2: anonymous routing/account gate/shared theme, public Tools with protected `/api/cloud-book`, and three cold mobile login samples under 4× CPU plus constrained networking. LCP samples were 1,616 ms, 1,804 ms and 1,892 ms (median 1,804 ms against the 2,500 ms target); CLS was 0 for all samples. The lightweight HTML entry shell contains only public branding, appears only when no saved Supabase session key exists, and is replaced by the existing React authentication flow; it does not grant access or contain private data.

Capacitor sync copied this release's web assets into the Android project. The initial Gradle/JVM loopback failure was traced to Windows AF_UNIX temporary-path handling in the agent process; a short `TEMP`/`TMP` plus JDK 21 resolved it. The current APK assembled successfully, passed v2 signature verification, and was installed in-place on the connected device. The device was locked during the final visual launch check, so authenticated feature interaction still requires an unlocked physical-device pass.

## Current follow-up audit release (2026-09-01)

Main/All READY: `dpl_2gtRHd4PaFYEE8Mn7g2rJyduiSoC` → https://nexus-lemon-eight-32.vercel.app. Tools READY: `dpl_5DJPPqi5fktrPBg7sXvy6xaZ2ePj` → https://nexus-tools-chi.vercel.app. Closes the remembered-tab idle lock, mobile Login performance, All CI coverage and Tools performance-isolation findings. Validation details: [remediation report](AUDIT_REMEDIATION_2026-09-01.md).

## Historical initial audit remediation release (2026-09-01)

Main/All READY: `dpl_GKLxCCNLA3WCSmaw5SoA9TfCxUHw` → https://nexus-lemon-eight-32.vercel.app. Tools READY: `dpl_Dm5Fr9F2rBXpiMAVNawCc1CvuzVa` → https://nexus-tools-chi.vercel.app. Cross-tab PIN locking, command contrast, public Tools and compatible security dependency patches are deployed. Validation and scope limits: [remediation report](AUDIT_REMEDIATION_2026-09-01.md).

## Historical All account menu release (2026-08-31)

Main/All READY: `dpl_8f4FhjnTFMxRW77K8jPvKXmy2S6g`, https://nexus-6qhyuu0fd-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app.

Replaced the All account Settings link with Lock account and Sign out dropdown actions. Reuses existing dropdown, outside-click/Escape hook, auth store and AppLockGate. Manual All locking persists a dedicated flag in the existing PIN store and clears remembered unlock via the existing lock action. Correct PIN returns to All without account logout; refresh/back do not bypass the requested gate. Ordinary All entry and Main's existing PIN rules remain unchanged. Missing PIN disables Lock with an explanation. Provider logout errors propagate; the installed SDK still clears the local session on remote errors, without restoring it.

Validation: local/Vercel Build/TypeScript, scoped ESLint and 61 unit checks passed; native lint completed with existing skill-script warnings. Existing 13 auth-entry cases passed, plus confirmed mobile/desktop account-menu cases (PIN errors, successful unlock, remembered-session invalidation, refresh/back, logout), and a missing-PIN/remote-logout-failure case. Menu screenshots reviewed after animations completed. Production anonymous gate smoke passed; live ProjectHub bundle includes dropdown and lockHub. Evidence `.impeccable/account-menu-*.log` and `.impeccable/account-menu-confirm`. The PIN remains the existing local privacy gate; this is not new server-side authorization.

## Previous monogram tilt release (2026-08-31)

Main/All READY: `dpl_B2DUCV7aejW9oRXZwuyWCUhuCn4p`, https://nexus-rh5pvenvl-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Existing static design and auth retained.

Added a bounded pointer-driven perspective tilt to the N image, not a 360° model. No new asset, WebGL, video or idle animation loop. Touch and Reduced Motion retain the static view; exit, scroll, blur and preference changes reset it. Local/Vercel Build/TypeScript, scoped ESLint and four unit checks passed; native lint completed with existing skill-script warnings. Four browser checks passed for responsive layout, idle behavior, pointer/reset/reduced motion and touch, followed by a 4× CPU confirmation and tilted screenshot review. Production anonymous gate smoke passed; live ProjectHub chunk contains both the N asset and rotateY interaction. Evidence `.impeccable/tilt-*.log`, `.impeccable/tilt-confirm`.

## Previous stale-shell update release (2026-08-31)

Main/All READY: `dpl_2ogVJ2K2LXjEu8QvAfYnFZZbZuKM`, https://nexus-du82c13t4-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Approved static All design retained.

Investigated a screenshot of the old conductor UI: alias and live ProjectHub bundle already pointed to the approved N release. Added network-first navigation with offline shell fallback, noncached worker registration and focus update checks, explicit server cache headers, and a dismissible update notice without forced reload. Legacy open tabs need one initial hard refresh; never clear user site data.

Build/TypeScript, scoped ESLint, six unit checks and two browser checks passed. Browser regression deliberately replaced cached shells with outdated HTML, then verified fresh online rendering, offline reload and retained local-storage sentinel. Production anonymous smoke passed; live worker reports no-store/must-revalidate/no-cache and contains NetworkFirst. Live ProjectHub bundle contains the static N asset and no hero video. Evidence `.impeccable/update-shell-*.log`. No authentication or local database changes.

## Previous approved static All release (2026-08-31)

Main/All READY: `dpl_41Pf2yCx4pDFyw9yigy29gRZsxG5`, https://nexus-g9sk3dyiw-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

Implemented the user-approved static black–purple N mockup. Replaced conductor video and playback controller with a 106,600-byte decorative WebP, left-aligned hero, horizontal Main/Tools rows and compact footer. Responsive mobile layout, shared theme preferences, account portal and existing auth/PIN behavior are preserved. Old media assets remain available but are no longer requested by All.

Validation: local/Vercel Build and TypeScript passed; scoped ESLint passed; native lint completed with existing skill-script warnings; 4 unit checks passed. Twelve layout/theme/static checks passed, followed by three corrected theme-specific keyboard/failure checks and 84 route/mode axe scans. All 13 isolated auth-entry checks passed, including direct Main entry and separate PIN behavior. Mobile/desktop screenshots and signed-in mobile layout reviewed. Production anonymous gate smoke passed, new artwork returned HTTP 200 with the expected size. Evidence `.impeccable/static-all-*.log` and related screenshot directories. No continuous animation, canvas or video playback remains in All.

## Previous forward-loop release (2026-08-31)

Main/All READY: `dpl_HHfjrJkEGVK2hP9qtQP8ksz22SJu`, https://nexus-82a2ghh1s-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

Replaced reverse playback with a 12-second forward-only slow-motion loop and baked one-second crossfade. Offline interpolation extends the four usable source seconds, not the original performance. 1920px video uses fastdecode encoding (2,649,664 bytes); viewports up to 768px select a 960px version (755,143 bytes) once before first playback. No runtime interpolation, added video layers or auth changes.

Local/Vercel Build and TypeScript passed, scoped ESLint and four related unit tests passed, native lint completed with existing skill-script warnings. Five browser checks passed, including expected responsive source widths, duration >=11.9 seconds, actual playback across the loop boundary, pause/resume, reduced motion and failure fallback. Six-second 4× CPU sample at 1920px: 0/180 frames dropped and animation-frame p95 16.7ms; device behavior may differ. Seam frames and desktop/mobile screenshots reviewed; interpolation and crossfade may show blended limbs. Production anonymous gate smoke passed and both video assets returned HTTP 200 with expected sizes. Evidence `.impeccable/loop-*.log` and `.impeccable/loop-tests`.

## Previous conductor desktop-detail release (2026-08-31)

Main/All READY: `dpl_G7LbD4soRUWWxtabpkXwhVi9Pfxb`, https://nexus-hebg2syvs-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

The conductor is now 1920×574 instead of 1280×382, re-derived from the supplied source, with lower compression and moderate baked-in sharpening. New video/poster URLs avoid retaining the old cached media. MP4 is 2,756,540 bytes; no additional runtime effects or auth changes. Source compression and motion blur still limit recoverable detail. Build/TypeScript, scoped ESLint, four unit checks and five playback/browser checks passed; native lint completed with existing skill-script warnings. Desktop/mobile screenshots reviewed. Six-second 4× CPU sample at 1920px: 0/180 video frames dropped, animation-frame p95 16.7ms. Production anonymous gate smoke passed; new live MP4 returned HTTP 200 and the expected size. Evidence `.impeccable/hd-*.log` and `.impeccable/hd-tests`.

## Previous conductor clarity release (2026-08-31)

Main/All READY: `dpl_WdbstT738P8yRvDVUr3QExyD1f3N`, https://nexus-6og70rv14-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

Re-encoded the supplied conductor source with mild baked-in sharpening, lifted shadow detail and reduced compression loss; updated the poster. Same dimensions, frame rate, playback controller and lightweight effects. MP4 increases to 1,221,637 bytes. No auth or application logic changes. Local/Vercel Build and TypeScript passed, native lint completed with existing skill-script warnings, scoped ESLint and four related unit tests passed. Five browser cases passed including measured playback, desktop/mobile controls, reduced motion and media failure. Six-second 4× CPU sample: 0/181 video frames dropped, animation-frame p95 16.8ms. Desktop/mobile screenshots reviewed. Production anonymous gate smoke passed; live MP4 returned HTTP 200 and the new size. Evidence `.impeccable/clarity-*.log` and `.impeccable/clarity-tests`.

## Previous conductor performance correction (2026-08-31)

Main/All READY: `dpl_DGKML9V2tKx5DYt9ywKsnZWuo1Uj`, https://nexus-fp3fonma0-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

Replaced expensive video masking/filtering, SVG blur and blend effects with static edge gradients and one opacity-only light layer. Retains purple conductor motion, responsive sizing and pause policies. No authentication or data changes.

Measured six seconds at 1920×1080 and 4× CPU slowdown: dropped video frames 79/182 before versus 2/182 after; animation-frame p95 83.3ms versus 16.8ms. Single controlled samples, not a guarantee for every device. Local and Vercel Build/TypeScript passed; native lint completed with existing skill-script warnings, scoped ESLint passed, 4 related unit tests and 5 responsive/playback browser cases passed. Desktop/mobile screenshots reviewed. Evidence: `.impeccable/glow-before`, `.impeccable/glow-after`, and `.impeccable/glow-smooth-*.log`.

## Previous conductor-light release (2026-08-31)

Main/All READY: `dpl_KTS39YQoQw6Wbmyx1RRTD3kuHHNE`, https://nexus-hkpketb0b-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

User requested more visual emphasis: added a localized purple aura, luminous arcs and small sparks; modestly brightened video. Slow 8-second light breathing follows existing pause/offscreen/hidden-tab state. Reduce Motion disables animation; no strobe, added media downloads or authentication changes.

Build/TypeScript, native lint, scoped ESLint and 4 related unit checks passed. Five browser cases passed, including 320–5760px responsive geometry, actual mobile/desktop playback, synchronized light pause, reduced-motion animation removal and media failure fallback. Desktop screenshot visually inspected. Evidence `.impeccable/conductor-glow-*.log` and `.impeccable/glow-production.log`.

## Previous responsive All release (2026-08-31)

Main/All READY: `dpl_DaVo5fhqTeeGoC1HAsmBTyqp3vV2`, https://nexus-egxxjht54-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged.

Fluid content gutters and wider desktop content; All video now preserves its supplied aspect ratio in normal document flow, avoiding mobile side cropping and text overlap. Removed duplicate obsolete image overrides. Browser zoom remains user-controlled, including 33%; use 100% for normal text size.

Validation: Build/TypeScript, native lint, scoped test ESLint, 4 related unit checks, 11 video/theme/reflow browser cases, plus a responsive case across 320/390/768/1280/1920/2560/5760 CSS-pixel widths passed. Desktop/mobile screenshots visually reviewed; production anonymous gate smoke passed. Logs `.impeccable/fluid-all-*.log`. No auth, data, playback policy or color changes.

## Previous conductor-video release (2026-08-31)

Main/All READY: `dpl_GZRxbnoeFUwvb7j8wV62QhZ4ZY8D`, https://nexus-j46tfz1g9-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools unchanged from the previous black–purple release.

User supplied a screen recording; extracted its conductor scene, cropped out surrounding website UI, graded purple and made a muted 8-second forward/reverse loop (470652-byte MP4 plus poster). The All hero now shows actual human movement, with play/pause, offscreen/tab suspension and Reduce Motion support. Auth/PIN/MFA unchanged. See SHARED_THEME.md for derivation details.

Build/TypeScript, native lint and scoped ESLint passed; related ProjectHub unit tests passed (4). The browser checks cover actual advancing video frames at mobile/desktop widths, pause/resume, offscreen pause, no MP4 request for Reduce Motion, and failed-media fallback. Route/mode accessibility scans passed (84 scans). Production anonymous gate smoke passed; deployed MP4 returns HTTP 200, video/mp4, length 470652. Logs: `.impeccable/conductor-*.log`.

The source only contains a short usable conductor shot: this is a cropped forward/reverse excerpt, not newly generated continuous choreography. Existing audit scores are scoped lab history; no new field performance or full-state certification is claimed for the moving background.

## Previous black–purple release (2026-08-31)

User requested black–purple branding and restoration of the original All background. Main/All READY: `dpl_fnDdXJ4zVit3DEdgfdR9Fmz1eyef`, https://nexus-oybvg1kqn-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Tools READY: `dpl_B9XR9t56jitVRGA51uv9HoTWxhPn`, https://nexus-tools-bl4yoy9mn-piecez2548s-projects.vercel.app → https://nexus-tools-chi.vercel.app.

Shared tokens now use black/purple; All's existing WebP background is restored and hue-adjusted with CSS, as is the login scene. Reserved responsive space and masking preserve readable copy. Semantic status colors, stored theme modes and auth/PIN/MFA policies are unchanged.

Validation: both builds/TypeScript and project lint; Main 47 related unit tests, 20 initial theme/reflow/a11y cases plus 2 PIN confirmations after updating old color expectations; 13 auth-entry cases; Tools 53 unit and 7 theme/a11y cases. Visually inspected restored desktop/mobile screenshots. Scoped ESLint for the current theme/auth/production tests passed; the legacy project-hub spec still has six pre-existing explicit-any findings under the external config.

Production smoke passed, including actual anonymous gates and black canvas. Constrained cold-login samples 2516 / 2364 / 2392 ms, median 2392 ms, CLS 0; the established median budget remains met, not a guarantee for each visit. Logs: `.impeccable/purple-*.log`, Tools `purple-*.log`.

## Previous entry-performance release (2026-08-31)

Main/All **READY**: `dpl_93h4NHCZqdTXyD58P4QrsTsDt7yJ`, https://nexus-l3hgze02c-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app. Deploy log: `.impeccable/deploy-entry-dictionary.log`. Tools remains on the READY deployment below; no Tools source changes in this pass.

Deferred the Sync engine behind its existing guarded async action and scoped entry translations to the existing core/security dictionaries using the same synchronous lookup. Visible content, theme and authentication policies are unchanged. Build/TypeScript/scoped ESLint passed, 102 related unit tests, 13 auth-entry cases and 14 theme/PIN/keyboard/readiness cases passed.

Final production smoke passed: anonymous gates/shared palette and three fresh mobile cold-login samples. LCP **2352 / 3016 / 2376 ms**, median **2376 ms**, CLS **0**, with CPU 4× and network 1.6 Mbps / 150 ms. The scoped audit reaches **20/20** against its predefined median <2500 ms criterion; the slower 3016 ms sample remains recorded. This is a lab result, not a guarantee for every visit or a field Core Web Vitals percentile. See SYSTEM_THEME_FORMALITY_AUDIT.md for both sample sets and limitations.

## Previous formal workspace release (2026-08-31)

- Main/All: **READY**, `dpl_DZmTUY5KkCUHNDRx1B2ApdLrTwx2`, https://nexus-bxgmog3jt-piecez2548s-projects.vercel.app → https://nexus-lemon-eight-32.vercel.app.
- Tools: **READY**, `dpl_HGpCihcZJ959BW2kBwQzumRyicmR`, https://nexus-tools-l4ejsaiuy-piecez2548s-projects.vercel.app → https://nexus-tools-chi.vercel.app.

User explicitly authorized deployment. Includes the formal shared controls/copy, responsive and accessible status text, validated theme handoff, per-tool lazy loading, associated form errors, topmost-only modal handling, preloaded fonts, pre-mount scoped All CSS, lazy Main route modules, and deferred optional monitoring with startup-error buffering. Account/MFA/PIN gate ordering remains intact. No user site storage was cleared.

Both Vercel production builds completed. Tools initially exposed root-tsconfig ES library diagnostics in serverless compilation despite READY status; root target/lib now match ES2023 and the final deployment no longer emits those diagnostics. Tools `.vercelignore` explicitly excludes local secrets, test artifacts and regenerated OCR/PDF assets.

Local evidence: 84 route/mode axe scans; responsive theme/PIN cases; keyboard validation, populated account and focus restoration; nested-modal and optional-monitoring tests; 13 auth-entry cases; Tools 53 unit tests and 29 browser cases. Scoped ESLint passed; Main's native Oxlint still reports historical warnings in skill scripts. See SYSTEM_THEME_FORMALITY_AUDIT.md for precise scope and limitations.

Final production smoke tests passed across three fresh browser contexts (6 tests): direct anonymous Main/Tools entry resolves to All login; the login identifies Nexus All and serves the charcoal theme. No production credentials or customer data were used. Under 4× CPU slowdown and 1.6 Mbps/150 ms network emulation, fresh-login LCP samples were 2800/2756/2684 ms, CLS 0. These are lab samples, not field Core Web Vitals. The median is still above a 2500 ms aspiration; a perfect performance score is not claimed.

An existing in-app browser tab continued to show an older cached app, while fresh contexts and the immutable deployment showed the new release. Reload an old tab (Ctrl+F5 if needed); do not clear local site data.

## Previous neutral palette (2026-08-31)

Main/All: `dpl_13cA2Rx7S7EusqZ1MS8BFpxKAc51`, https://nexus-34zmmx0t3-piecez2548s-projects.vercel.app, aliased to https://nexus-lemon-eight-32.vercel.app.

Tools: `dpl_9J4khd2MVsxRdKDNzdD2FEuQpQk1`, https://nexus-tools-doogn9pph-piecez2548s-projects.vercel.app, aliased to https://nexus-tools-chi.vercel.app.

Both are READY production deployments. The neutral refinement uses charcoal surfaces and gray secondary text/borders, keeping restrained green for actions and selection. Tools now also includes the previously local central-entry and shared-theme changes.

Checks: both builds and TypeScript passed; scoped ESLint and project lint passed (Main still reports existing skill-script warnings); 82 related unit tests and 22 browser cases passed, with a final two-case PIN confirmation after waiting for input color transitions. Anonymous live checks confirmed Main redirects to All, All's new canvas is rgb(11, 14, 13), new PIN/Dashboard styles are served, and a direct anonymous Tools visit returns to All. Private authenticated content was verified with local fixtures, not live customer credentials.


## Previous shared-theme and central-login deployment (2026-08-31)

Production deployment: `dpl_7RHgM2ERZmB8aSEy3cirebXrLu89` (READY).
- Stable URL: https://nexus-lemon-eight-32.vercel.app/projects
- Immutable URL: https://nexus-5qfdx8gdo-piecez2548s-projects.vercel.app

Includes shared Main/All/login tokens, the readable green PIN screen and Dashboard action, corrected hub title, central account login at All, and the Main-only PIN gate. Local and Vercel production builds passed. TypeScript, scoped ESLint (without inline directives because the external config does not install react-hooks), Oxlint, 21 lock/hub tests and 12 theme browser cases passed; two PIN cases were confirmed after the input-surface adjustment. Existing auth-entry regression coverage passed before this visual follow-up.

Anonymous live browser verification confirmed that /dashboard redirects to /projects?returnTo=%2Fdashboard, the login canvas is rgb(7, 13, 11), and production CSS includes shared PIN and Dashboard action styles. No real account credentials or private data were used. Authenticated visuals were verified locally; existing browser tabs may need a reload after the service-worker update. Do not clear site storage, which contains local user data.

This deployment updates Nexus Main/All only; the sibling Tools changes have not been deployed in this step.


## Previous authenticated deployment (2026-08-31)

Published to the existing `nexus` Vercel project: `dpl_5FjumZeLTysUPuUpYwQLTxARJMRV`.
- Stable URL: https://nexus-lemon-eight-32.vercel.app/projects
- Immutable URL: https://nexus-jnhfcowc6-piecez2548s-projects.vercel.app

Includes the Home-themed login and shared-session Home route, with account name/user icon linked to settings. Legacy `/projects/index.html` redirects to `/projects`. Production build including TypeScript passed; scoped ESLint/Oxlint passed; 46 auth/profile integration tests and 8 synthetic-auth browser cases passed. Desktop/mobile screenshots verified the account control. Live anonymous browser smoke check confirmed the new login at `/projects`; real customer credentials were not used to test a production sign-in.

## Previous deployment

Deployed 2026-08-31 to the existing Vercel project `nexus` (production).

- Public gateway: https://nexus-lemon-eight-32.vercel.app/projects
- Canonical document: https://nexus-lemon-eight-32.vercel.app/projects/index.html
- Nexus Main: https://nexus-lemon-eight-32.vercel.app/dashboard
- Immutable deployment: https://nexus-if8t10bx0-piecez2548s-projects.vercel.app
- Deployment ID: dpl_Cr4evhQyTsXQeFFZuhVqas7k2Twz

The root app and its routes are preserved. `/projects` and `/projects/` redirect to the gateway document. Workbox's SPA navigation fallback excludes `/projects` so the gateway can load independently. Explicit `skipWaiting` and `clientsClaim` activate the updated worker automatically after installation, matching the intended auto-update behavior with manual registration. An already-open document may need a subsequent navigation after the update installs.

`.vercelignore` excludes local environment files, agent tooling, review artifacts, dependencies, generated builds and native wrapper directories from deployment uploads. Existing Vercel project/environment settings were retained; local environment files were not uploaded.

Validation: local and Vercel production builds passed; TypeScript (build), targeted Oxlint and ESLint passed; 12 related browser checks passed. Public HTTP checks returned 200 with correct HTML/CSS/image/font types for the gateway and sampled assets; `/dashboard` and `/sw.js` returned 200. The browser initially received the previous SPA from an older active service worker. After the activation fix deployed and a subsequent navigation, the same browser displayed the public gateway, both matched project cards, and their intended destination links. These are deployment smoke checks, not a full authenticated application regression suite.

## DataLens executive release (2026-09-08)

DataLens READY: `dpl_HU4sTZxuj5AGS4JpF42N8q9mvNJK`, https://datalens-iebfh95it-piecez2548s-projects.vercel.app → https://datalens-kappa-one.vercel.app.

The Nexus All destination remains the stable DataLens production URL. DataLens uses the approved Supabase identity in a separate-origin session and does not receive a Nexus PIN, session token, or CSV through the hub link. Frontend lint/build/npm audit, backend Ruff/26 tests/pip-audit, and Playwright E2E passed. Live production checks confirmed health 200 with authentication required, unauthenticated analysis rejected with 401, no-store API responses, and HSTS/CSP/frame/MIME security headers.
## Five-role hardening release (2026-09-09)

- Nexus All/Main: `dpl_6Jm7nBCSf45s874JLB1KpSH8WndP` → https://nexus-lemon-eight-32.vercel.app
- Nexus Tools: `dpl_6EebzdVEhB44hiGmBFaz5AP5RauJ` → https://nexus-tools-chi.vercel.app
- DataLens v0.7.0: `dpl_88vRJpym3LkSDpXAnYEeAdSEtxpz` → https://datalens-kappa-one.vercel.app

Production smoke passed across all three origins, including Nexus CSP/frame/MIME headers, public Tools availability with private cloud API authorization, DataLens authentication enforcement, and a constrained mobile cold-login median LCP of 1.836 seconds with CLS 0.
