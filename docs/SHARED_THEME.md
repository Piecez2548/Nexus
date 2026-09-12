# Shared Nexus theme

## All account dropdown — 2026-08-31

The account name is now a disclosure button, not a Settings link. Reuses DropdownPanel and useClickOutside for an account region containing Lock account and Sign out, including Escape/focus dismissal, pending state and logout failure feedback. Devices without a configured PIN show an explanation and disabled Lock action.

Manual All locking calls the existing PIN lock action (clears remembered unlock and in-memory encryption key), then persists `hubLockRequired` in the existing app-lock store. Only this explicit request adds AppLockGate to All; ordinary All entry remains account-login-only. Successful PIN unlock/setup/recovery or disabling PIN clears the flag. Refresh/history preserve the requested gate. Logout reuses authStore.signOut and propagates provider errors. The installed Supabase SDK removes the local session even on a remote logout error; the UI must not restore that session (remote revocation is not guaranteed in that case). Existing Main PIN flow remains unchanged; PIN remains the existing local privacy gate, not new server authorization.

## Pointer-driven monogram depth — 2026-08-31

The approved N artwork now responds to a fine hover pointer with bounded CSS perspective/rotateX/rotateY (5°/7° maximum). This is a 2.5D treatment of the image, not a new 360° mesh. A small presentation controller coalesces pointer events into at most one requested animation frame; there is no idle render loop, video, WebGL or additional media. The transform resets on pointer exit/cancel, scrolling, blur, visibility or media-preference changes, and listeners/queued frames are removed on unmount. Reduced Motion and touch devices retain the static image. Only transform transitions are used; the shared layout, artwork and auth behavior remain unchanged.

## Stale-page update handling — 2026-08-31

User screenshot showed the superseded conductor layout. Vercel alias inspection confirmed the static release was assigned to the stable domain; its live precached ProjectHub chunk contained `nexus-monogram.webp` and no video. This establishes a stale client/document symptom, not a missing production design; the user's Opera cache itself was not inspected.

Navigation now prefers network HTML with a four-second timeout and retains cached/precache fallback offline. Worker registration bypasses HTTP cache and checks on tab focus. A controller change offers a dismissible refresh notice, never an automatic reload that might discard unsaved work. Server headers revalidate the shell and prevent worker HTTP caching. No storage clearing or database migration is performed. Previously opened legacy pages still require an initial hard refresh to load this new updater.

## Approved static All design — 2026-08-31

Implemented the user's approved black–purple mockup: left-aligned Thai hero, sculptural static N artwork, two horizontal workspace rows, restrained dividers and compact footer. Mobile stacks the hero and exposes full-width destination controls. Shared Light/Dark/Mono tokens, account portal and existing Main/Tools destinations remain; no auth logic changed.

Removed video markup, decorative animation layers and the unused `hubMotion.ts` controller. All now loads a 106,600-byte WebP instead of continuously playing MP4 media. The image is decorative and links/copy remain usable if it fails. Source artwork was derived with the built-in image-generation tool from the approved mockup: extract the brushed violet N alone, preserve its shape and soft lighting, transparent background, no UI/text/glow. Project asset: `public/projects/assets/nexus-monogram.webp`. Older conductor assets are retained but not referenced by All; previous sections below record superseded releases.

## Forward conductor loop and responsive media — 2026-08-31

Replaced the eight-second forward/reverse edit with a twelve-second forward-only slow-motion loop, derived from the same four usable seconds. Offline motion interpolation supplies 30 fps; a one-second baked crossfade joins the end to the opening. This extends playback time, not the amount of original action; a longer natural-speed performance requires longer source footage. Motion interpolation/crossfade can show artifacts around fast-moving limbs.

The motion controller selects a 960px video for viewports up to 768 CSS pixels, otherwise the 1920px version, once on first playback to avoid resize interruptions. Both use H.264 fastdecode settings, no B frames, one reference frame and a two-second keyframe interval. No runtime optical-flow, reverse playback or overlapping video elements. Existing pause, visibility and reduced-motion behavior remains.

## Conductor desktop-detail refinement — 2026-08-31

All now references `conductor-purple-hd.mp4` and `conductor-poster-hd.webp`, avoiding reuse of the previous cached asset URLs. Re-derived from the supplied 2880×2160 recording's 2040×610 scene crop at 1920×574 instead of 1280×382; keeps 30 fps and the eight-second loop. Lanczos downsampling, mild sharpening (0.8) and CRF 17 retain more source detail at desktop size. MP4 is 2,756,540 bytes. No runtime rendering effects added. The source itself is compressed screen-recorded footage; sharpening cannot recover absent detail or remove all motion blur.

## Conductor clarity refinement — 2026-08-31

Re-encoded directly from the supplied source with Lanczos downsampling, gamma 1.12, contrast 1.04 and mild baked-in sharpening (unsharp 5:5:0.55). H.264 CRF 18 reduces compression loss; video remains 1280×382 at 30 fps, silent, eight seconds, with the existing forward/reverse loop. Updated matching poster. MP4 is 1,221,637 bytes, up from 470,652; no additional runtime filters or layers. Detail remains limited by the source recording. A six-second Chromium sample with 4× CPU throttling recorded 0 dropped frames out of 181 and animation-frame p95 16.8ms; this is a lab sample, not a device-wide guarantee.

## Conductor rendering correction — 2026-08-31

The decorative light uses one opacity-only HTML layer with static purple arcs and aura. Removed SVG Gaussian blur, blend passes, video brightness/contrast filters and the video-container mask; static edge gradients retain the fade. Motion still follows pause, offscreen, hidden-tab and Reduce Motion settings. Shared colors and authentication are unchanged.

Implemented 2026-08-31 for Nexus Main, Nexus All, authentication screens, and the sibling Nexus Tools application.

`src/styles/nexusTheme.css` is the canonical palette and font definition. It is imported by `src/styles/index.css` at application startup, outside routing and authentication. Main's `mainTheme.css` contains shell layout and interaction styling only. The existing ThemeEffect and saved Dark/Light/System/Mono preferences are preserved.

The project hub and login stylesheet consume shared tokens instead of defining their own dark palettes. Hub presentation rules are scoped to `.project-hub`, including its motion state, so loading the hub cannot restyle unrelated navigation or dialogs. The About section follows the selected mode. Decorative imagery remains separate from functional surfaces and text contrast.

Nexus Tools vendors the exact same stylesheet as `src/nexusTheme.css` and the two self-hosted fonts. Its existing CSS variables map to the shared tokens; its root ThemeEffect now applies the saved Dark/Light mode before the authentication gate and media viewer. Tools remains independently buildable and deployable.

From the sibling `Nexus-Tools` checkout, run `node scripts/sync-theme.mjs` after changing the canonical theme, and `node scripts/sync-theme.mjs --check` to reject drift. The synchronization command expects the existing sibling directory layout; production builds do not depend on that layout.

New pages must inherit the root theme. Reuse shared tokens for canvas, surfaces, text, focus, controls and brand accents; do not add a page-specific color mode or palette. Keep semantic status colors, chart series, category icons, and document/image previews where color carries meaning. This change does not repaint user content.

Scope limits: Main/All share one stored preference. Tools uses its existing preference on a different origin; automatic cross-origin mode synchronization is not implemented. Tools retains its existing two modes rather than adding Mono/System. No deployment is performed by this change.

Regression coverage lives in `e2e/main-theme.spec.ts`, `e2e/auth-entry.spec.ts`, and Tools' `e2e/theme.spec.ts`; existing theme, login, hub and tool tests remain applicable.

## PIN and live theme follow-up (2026-08-31)

The PIN screen now uses the shared canvas, surface, input, readable foreground and bright primary-action tokens, with the Nexus wordmark replacing the old lightning mark. Dashboard's main action uses the same primary-action tokens as All. PIN/biometric/encryption behavior is unchanged. Existing saved theme modes remain respected. Desktop/mobile theme regression tests cover PIN outside MainLayout as well as All/Main routes.

Main/All shared-theme and PIN follow-up deployed on 2026-08-31 as `dpl_7RHgM2ERZmB8aSEy3cirebXrLu89`. See PROJECT_HUB_DEPLOYMENT.md. This later deployment supersedes the earlier no-deployment note for Main/All; Tools remains a separate deployment.

## Neutral refinement (2026-08-31)

Approved change: near-black canvas `#0b0e0d`, charcoal surfaces `#181a1b` / `#161819`, off-white text `#f1f2f1`, neutral gray secondary text/borders, and restrained green action `#55d995`. Light mode uses neutral off-whites/grays; Mono remains unchanged. Both projects consume the same tokens. No layout, data, PIN or account-policy changes were made in this palette refinement.

Neutral refinement is now deployed to both Main/All and Tools; see the current deployment section in PROJECT_HUB_DEPLOYMENT.md. Earlier notes about Tools remaining undeployed are historical.

## Formal workspace refinement (deployed, 2026-08-31)

Primary controls now use semantic action pairs with a 48px minimum height and 12px radius. Main content controls have 44px minimum targets. Status text uses accessible light/dark hues without repainting charts. All is a static workspace entry, with personal portfolio copy and decorative hero media removed. Tools metadata is at least 13px in tools.css and each workspace feature loads on demand.

The verified, origin/source/nonce-checked Main-to-Tools session handoff now carries the saved Dark/Light/System/Mono mode. Tools validates and persists only those values; System tracks OS changes and Mono uses shared neutral tokens. This is synchronization on authenticated launch, not live bidirectional synchronization between open tabs. Independent visits retain their saved preference. Credentials are still excluded from URLs, and PIN/MFA gates are unchanged.

These refinements are deployed to both production aliases. See PROJECT_HUB_DEPLOYMENT.md for the current immutable deployments.

Readiness follow-up: All CSS now loads as a scoped Vite stylesheet before mounting, removing first-paint layout shift. Main-only modules load behind the unchanged account/PIN gate order. FormField associates validation messages with inputs, and nested overlays process Escape only at the top of the stack. Optional monitoring loads asynchronously, buffers startup errors, and keeps sendDefaultPii disabled.

Entry performance follow-up: the Sync engine loads inside the existing asynchronous sync action, after the signed-in/concurrent-sync guards. Login and account challenges use the existing core/security dictionaries through a shared synchronous translation helper; financial, life and analytics copy remains in Main's full dictionary. Both language variants remain immediately available. The full `useTranslation`/`translate` API, persisted locale, theme tokens, visible copy and authentication policy are unchanged. Entry JS decreased from 452.54 kB (114.80 kB gzip) to 225.44 kB (67.49 kB gzip) after the dictionary split.


## Black–purple direction (2026-08-31)

User explicitly replaced the green brand accent with purple and requested the original All background back. Canonical tokens now use black #0c0b10, elevated #19171f, purple #b69aff with #211337 ink, and light-mode #6d28d9 with white ink. The unchanged WebP scene is restored with CSS hue rotation, responsive small asset, a reserved layout area and edge masking; login artwork uses the same treatment. Mono stays grayscale. Success/income/category colors keep their semantic meaning. No account, PIN, MFA, data or sync changes.


## Supplied conductor motion (2026-08-31)

All now uses the user-supplied MP4 rather than simulating human movement in a still image. The delivered asset extracts seconds 7–11, crops the scene from the screen recording (2040×610 at 420,1110), scales to 1280×382 / 30 fps, grades to purple and appends a reversed pass for an 8-second loop. H.264/yuv420p fast-start MP4, no audio, about 471 kB; matching WebP poster about 8 kB. The original file in Downloads is untouched.

The existing hub motion controller starts muted inline playback only when visible, pauses offscreen/in hidden tabs and on request, and respects Reduce Motion without fetching MP4 on initial load. Poster and manual retry remain available if playback fails; stale play rejections cannot override newer requests. The scene reserves its dimensions and keeps text/controls outside the video. Login/Main/Tools and all security policies are unchanged.


## Responsive All follow-up (2026-08-31)

All uses fluid gutters with a 1760px content maximum and a 1920px video maximum. The hero now lays out copy, the 1280:382 video and its controls in normal flow rather than absolute positioning/fixed heights. Video uses contain, preserving the full supplied crop on narrow screens; text enlargement pushes the scene down without overlap. Removed duplicate restored-image overrides superseded by video. Browser zoom remains under user control: 33% still reduces text; no inverse-zoom or forced scaling is applied. Validation includes 320–5760 CSS-pixel viewports, not a claim to override browser zoom.


## Conductor light emphasis (2026-08-31)

Added localized purple aura, two luminous arcs and six small sparks around the conductor, plus modest video brightness/contrast. The light breathes over 8 seconds (opacity/very small spark translation), without strobing or whole-page flashes. All light animation reuses the existing data-motion state: paused on user pause, offscreen or hidden tab, and disabled for Reduce Motion. Forced Colors hides decorative light; Mono remains grayscale. Effects are contained within the responsive video surface and never cover copy or controls. No new media requests or changes to authentication.
