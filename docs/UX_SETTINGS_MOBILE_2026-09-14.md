# Mobile Settings usability pass — 2026-09-14

## Scope

UX-006 refines the existing Settings and fingerprint setup flows for small screens. No store, repository, navigation, or security behavior was changed.

## Changes

- Settings cards use smaller padding on small screens and keep the existing desktop spacing at the `sm` breakpoint and above.
- Settings page title and section spacing scale down on small screens so more controls remain visible during a single scroll.
- Enabled fingerprint status and its disable action stack on small screens. The disable action keeps a full-width, 44px-plus touch target and remains inline on larger screens.
- Fingerprint setup now explains the four-digit minimum, uses `current-password` autocomplete semantics, marks the PIN as required, prevents submit until four characters are entered, and connects errors to the field through `FormField`.

## Verification

- Focused lock/settings tests: 46/46 passed.
- TypeScript build: passed.
- Oxlint: passed.
- Production Vite build: passed.
- Visual inspection: mobile 420×933 and desktop 1440×900 screenshots from the local production-shaped dev render; mobile card density and responsive fingerprint layout were checked.

## Remaining

- A fresh Android APK install was intentionally deferred under the current user instruction to finish the planned code cycle before mobile deployment.
