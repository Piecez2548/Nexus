# Final regression smoke — 2026-09-14

## Scope

CORE-SMOKE-002 verifies the main user paths after the mobile Settings usability pass. The run covered the production-shaped browser build and the installed Android debug build without changing production data.

## Browser verification

- `npx playwright test e2e/core-smoke.spec.ts e2e/mobile.spec.ts --project=chromium`
- Result: 5/5 passed in 41.4 seconds.
- Covered Dashboard load, add transaction, calculated totals, reload persistence, Transactions navigation, mobile bottom navigation, FAB drawer, mobile CRUD, and the narrow Strategies drawer.

## Android verification

- Device: vivo V2348 (`10AE9R1ZJY001PY`), APK installed in place from the UX build.
- Navigated inside the app from Dashboard → Transactions → Settings: 3/3 routes rendered correctly.
- WebView `pageerror` count: 0.
- At 420px CSS width, `document.documentElement.scrollWidth` was 420px, matching `innerWidth`; no horizontal overflow was detected.
- Existing App Lock and fingerprint unlock were exercised before the route checks. No transaction data was created, edited, or deleted during this physical smoke run.

## Result

The main mobile and desktop regression paths remain green after the UX changes. Release signing and store distribution remain outside this personal/demo cycle.
