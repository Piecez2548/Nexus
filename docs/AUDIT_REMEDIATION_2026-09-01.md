# Audit remediation — 2026-09-01

Scope: the user's four requested groups from SYSTEM_AUDIT_2026-09-01.md. No architecture redesign or finance calculation changes.

## Implemented

- **AUD-001 — same-origin tab locking:** a persisted opaque lock generation invalidates old tab unlock/Remember state. Storage events plus focus/visibility fallback clear the other tab's in-memory encryption DEK and close its PIN gate. Startup rehydration rejects stale remembered sessions. A correct fresh PIN acknowledges the generation; an unlock racing a newer lock is rejected. No PIN/token/DEK crosses tabs. Explicit All lock also gates All. This is not cross-device/global logout; unavailable browser storage limits synchronization to the current tab.
- **AUD-002 — command contrast:** selected group metadata inherits the action foreground rather than forcing white on purple. Shared Light/Dark/Mono color roles remain.
- **AUD-003 — public Tools:** removed catalogue-wide AuthGate. Local utilities remain usable anonymously, after sign-out and during account verification failures. Optional account initialization/SSO remains; cloud identity, ownership and MFA validation in server/account and private APIs is unchanged. Local records are not automatically uploaded or removed on sign-out.
- **AUD-004 — regression harness:** scoped Account/More/Type selectors; budget fixtures use toLocalDateString rather than UTC truncation; login uses its configured authenticated build instead of a hard-coded dev port and obsolete color literals. Default unit concurrency is bounded at four workers. Performance checks retain their thresholds but run separately with NEXUS_PERFORMANCE=1 and one browser worker. CI explicitly runs functional, authentication, login and isolated performance groups.
- **AUD-005 — dependencies:** React Router DOM 7.18.3 and transitive DOMPurify 3.4.14; compatible lockfile remediation also addresses development-tool advisories without force/major upgrades. Full npm audit on the resolved Main and Tools lockfiles reports zero advisories at verification time, not a guarantee of no unknown vulnerability.
- **AUD-006 — documentation:** current security/access matrix, route-gate topology, All account menu and Tools public behavior synchronized. Historical audit findings and release evidence remain historical; this document records their remediation.

## Validation

Synthetic local data only for authenticated tests; production checks are anonymous and read-only. No customer records, real cloud uploads or migrations.

- Initial targeted Main tests: 63/63 passed.
- All authentication/PIN/cross-tab browser regression: 17/17 passed.
- Dedicated login accessibility/validation: 5/5 passed.
- Tools unit/server/SSO tests: 53/53 passed; Chromium functional/auth tests: 31/31 passed.
- Main full unit/integration suite: 447 files, 2,769 tests passed. Full functional browser suite: 119 passed; one performance case intentionally runs separately.
- After installing the final compatible development dependency patches: 62 targeted tests passed; fresh Build/TypeScript plus 14 browser checks passed without retries, including all three themes, 320/768/1280px, Thai 200% text, keyboard forms and the isolated mobile performance budget (LCP <4s, CLS <0.1). The full 2,769-test run preceded those final development-only patches.
- Main native lint and scoped ESLint passed; native lint retains existing warnings in vendored skill scripts. Tools Build/TypeScript and ESLint passed. Full installed Main npm audit and Tools npm audit each report zero known vulnerabilities.
- Evidence logs are under each repository's `.impeccable/hardening-*`; full Main runs: `hardening-full-unit.log`, `hardening-full-browser.log`; final checks: `hardening-final-targeted.log`, `hardening-final-browser.log`, `hardening-final-lint.log`, `hardening-installed-audit.json`.

## Production release

- Main/All READY: `dpl_GKLxCCNLA3WCSmaw5SoA9TfCxUHw`, [immutable release](https://nexus-q0h7gt2fs-piecez2548s-projects.vercel.app), serving https://nexus-lemon-eight-32.vercel.app.
- Tools READY: `dpl_Dm5Fr9F2rBXpiMAVNawCc1CvuzVa`, [immutable release](https://nexus-tools-dfctyrj1i-piecez2548s-projects.vercel.app), serving https://nexus-tools-chi.vercel.app.
- Post-deploy anonymous Chromium smoke passed: direct Main redirects to All login; all 17 Tools cards render without login; private Tools cloud-book API returns 401. The public Main bundle contains the new lock signal implementation. Authenticated cross-tab behavior was verified with synthetic local fixtures, not a customer's live account.
- Deployment logs: `hardening-main-deploy.log` and Tools `hardening-tools-deploy.log`; final smoke: `hardening-production-final.log`.

### Follow-up audit fixes

- Main remembered access now obeys the configured idle timeout in a fresh tab; 37/37 focused lock/login tests and the 17/17 authentication/cross-tab browser suite pass.
- All's authenticated layout suite is current and part of CI: 12/12 checks pass across 320, 390, 768, 1280 and 1920px, including axe, keyboard, reduced motion, 200% text and forced colors.
- The constrained mobile Login waterfall no longer prioritizes brand fonts ahead of entry JavaScript, monitoring SDK loading is deferred while early errors remain buffered, and the mobile Login uses a platform UI font to prevent a late webfont LCP. The final production samples were 6,332 / 2,480 / 2,396ms; median **2,480ms** passes the existing <2,500ms target with CLS 0. The slow sample is retained as evidence of network variance.
- Tools functional and performance runs are isolated. Tools unit 53/53, SSO 6/6 and isolated local/production performance checks pass; the functional matrix excludes only the separately invoked performance spec.
- Final releases: Main/All `dpl_2gtRHd4PaFYEE8Mn7g2rJyduiSoC` → https://nexus-lemon-eight-32.vercel.app; Tools `dpl_5DJPPqi5fktrPBg7sXvy6xaZ2ePj` → https://nexus-tools-chi.vercel.app. Final anonymous smoke confirms the All login, 17 public Tools and private cloud API 401.
- Final evidence: `.impeccable/fix-*` in Main and Tools. The follow-up audit's original 17/20 remains historical; these results close its four findings but do not manufacture a new score without another bounded audit.

## Remaining scope limits

This closes the requested findings after verification, not every possible security issue. Native physical devices, real cross-account penetration testing, disabled-storage cross-tab guarantees and field Core Web Vitals are not certified. The earlier 13/20 is historical; no unsupported new 20/20 score is assigned here.
