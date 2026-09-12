# Nexus system audit — 31 August–1 September 2026

> Historical baseline. The user subsequently authorized remediation of all six finding groups. See [AUDIT_REMEDIATION_2026-09-01.md](AUDIT_REMEDIATION_2026-09-01.md) for current fixes, regression results and deployment evidence. The original findings and score below are retained as audit evidence.

Audit-only review of Nexus All, Nexus Main and Nexus Tools. No application source fixes, dependency updates or deployments were performed. Existing uncommitted work was preserved. Browser mutation tests used isolated local synthetic data, not the user's production account.

## Implementation integrity verdict

The black–purple visual system is coherent, but the system is **not ready to claim 20/20**. Verified accessibility and cross-tab locking defects remain, Tools access differs from the user's stated requirement, and the main regression suite is not green. A passing targeted UI release check must not be presented as a complete system audit.

## Audit health score

**13/20 — Acceptable, with important work remaining.** This is a conservative engineering/design assessment of the inspected scope, not an automated certification or a score for visual beauty alone. Untested production/native/security scenarios are not silently awarded full marks.

| Dimension | Score / 4 | Basis |
|---|---:|---|
| Accessibility | 2 | Confirmed command-palette AA contrast failure; many shell/catalogue checks pass |
| Performance | 3 | Separate constrained reruns pass existing budgets; cold samples vary, no field INP data |
| Responsive design | 3 | Tested layouts reflow and mobile controls work; not exhaustive device/text/zoom coverage |
| Theming | 3 | Canonical tokens match; one verified selected-state foreground escapes the palette contract |
| Implementation integrity | 2 | Cross-tab lock gap, Tools requirement mismatch, red regression harness and documentation drift |
| **Total** | **13/20** | **Do not sign off as 20/20 yet** |

Six actionable finding groups: **P0: 0 verified; P1: 3; P2: 3; P3: 0**. Absence of a verified P0 is not proof that no undiscovered security issue exists.

## Verified findings

### AUD-001 — P1: Locking All does not lock another unlocked Main tab

- Location: `src/store/appLock/pinLockSlice.ts:43`, `:89`, `:95`; `src/store/appLockStore.ts:17`.
- Category: implementation integrity / local privacy.
- Reproduction: open two authenticated tabs with a configured PIN; unlock Main in the second tab; click **ล็อคบัญชี** in All in the first tab. First tab shows PIN, while Main in the second remains visible, including after reload.
- Evidence: `.impeccable/audit-cross-tab.log` and `.impeccable/e2e/cross-tab.audit.spec.ts`; the diagnostic test passes by asserting the observed gap, not by asserting security correctness.
- Cause: unlocked state is per-tab session storage / in-memory state; a lock does not invalidate it in other tabs. Persisting `hubLockRequired` does not override `sessionUnlocked` in `isLocked()`.
- Impact: someone returning to a shared device may still view an already-open workspace after the user believes the account is locked. This is a local privacy-gate gap, not evidence of a remote Supabase authentication bypass.
- Recommendation: broadcast lock/invalidation across same-origin tabs and apply a persisted lock generation on reload; preserve legitimate login and require PIN again. Add a regression asserting both tabs lock. Suggested command: `$impeccable harden`.

### AUD-002 — P1: Selected command metadata fails contrast

- Location: `src/platform/commandPalette/CommandPalette.tsx:151`.
- Category: accessibility / theming; WCAG 1.4.3.
- Selected row uses the shared purple action background, but its group label overrides foreground with `text-white`.
- Verified rendered ratio: **2.31:1**, white `#ffffff` on `#b69aff`; at 200% text the measured 24px text requires at least 3:1. Normal smaller text requires 4.5:1.
- Evidence: original `main-shell-audit` failure and independent reproduction in `.impeccable/audit-repros.log`. Keyboard focus trapping and text reflow passed before the contrast assertion.
- Recommendation: use the shared action foreground for selected metadata, then recheck all three themes, normal text and 200% text. Suggested command: `$impeccable harden`.

### AUD-003 — P1: Tools anonymous access contradicts the requested behavior

- Location: `D:/Project_001/Nexus-Tools/src/main.tsx:12`, `src/components/AuthGate.tsx`; `docs/PROJECT_HUB_AUTH.md`.
- User requirement: Tools should be usable without login. Current implementation redirects anonymous Tools visitors to All sign-in and only renders Tools for a verified account.
- Verified both by local Tools auth tests and the current production anonymous smoke test. These tests pass because they assert the implemented behavior; that does not make it match the user's requirement.
- Recommendation: separate public local tools from account/cloud features, retaining authentication for private data and account services. Adjust tests and documentation to the agreed access matrix. Suggested command: `$impeccable harden`.

### AUD-004 — P2: Main regression harness contains stale selectors, ports and dates

- Main browser suite: **104 passed / 21 failed**. This does **not** mean 21 product bugs.
- 11 failures select `Account` ambiguously against both `Account` and `All Accounts`; 2 select `More` against `More info`; 5 legacy login cases hard-code port 5173 while the suite serves 4173.
- Transfer integration test selects `Type` ambiguously. Its browser test also did not reliably target the form's type selector. Diagnostic copies scoped to the actual form control successfully created a transfer and completed transaction CRUD; product code was unchanged.
- Six unit failures across four files use `new Date().toISOString().slice(0, 10)` for a local-month budget fixture. At the Bangkok September boundary this is still August in UTC. **All 19 tests in those four files pass with TZ=UTC**. Locations: `src/features/finance/pages/Budget.integration.test.tsx:11`, `src/layouts/TopBar.test.tsx:65`, `src/hooks/useNotifications.test.ts:10`, `src/features/finance/hooks/useBudgetProgress.test.ts:9`.
- A second diagnostic browser run corrected only ambiguous selectors in copies of the affected suites: **11/11 passed**, including duplicate merging, category merging, budgets, recipient learning, reports and More navigation. Evidence: `.impeccable/audit-selectors.log`. No application fixes were required for those reproductions.
- Remaining full-browser failures include the confirmed contrast defect and a constrained performance budget failure; performance must be interpreted separately from parallel test load.
- Recommendation: scope selectors; remove hard-coded test origins; make fixtures deterministic in the app's local date model; keep dedicated authenticated and anonymous configurations. Do not weaken assertions merely to obtain a green score. Suggested command: `$impeccable harden`.

### AUD-005 — P2: Production dependency advisories need maintenance

- `npm audit --omit=dev --json`: Main reports 3 affected package entries (2 high, 1 moderate), representing 2 advisory families. Tools reports 0. This is a package inventory result, not proof of exploitation.
- React Router advisory affects unstable RSC APIs. This application uses `createBrowserRouter` in a Vite SPA; no affected RSC path was identified, so the high package rating is **not** reported as a confirmed high-severity application exploit. [Advisory](https://github.com/advisories/GHSA-qwww-vcr4-c8h2).
- DOMPurify advisory concerns an IN_PLACE hook/removal path. No direct application use of that path was established; verify transitive PDF/HTML usage when upgrading. [Advisory](https://github.com/advisories/GHSA-55q2-fjhq-7xh7).
- Evidence: `.impeccable/system-audit-dependencies.json`, `.impeccable/audit-tools-dependencies.json`.
- Recommendation: update compatible patched dependencies and run PDF/export/navigation regressions. No automatic audit fix was executed. Suggested command: `$impeccable harden`.

### AUD-006 — P2: Security documentation no longer describes browser access accurately

- `docs/SECURITY.md:7` says security is optional and the app is fully usable without configuration. The published browser build now requires configured authentication and All handles sign-in.
- `docs/PROJECT_HUB_AUTH.md` describes the newer gate but its opening architecture description still says All is outside AppLockGate without the explicit account-lock exception added later.
- Impact: the next implementation or audit may follow the wrong access contract. Historic release notes should remain clearly historic, while current-state documentation should have one unambiguous access matrix.
- Recommendation: synchronize current security/routing/access descriptions after AUD-001/AUD-003 decisions. Suggested command: `$impeccable document`.

## Positive findings and visual judgment

- All's current restrained black–purple hero, static metallic N, clear workspace rows and compact navigation look coherent and more formal than the superseded video effects. This is qualitative design judgment, not an automated score.
- Shared theme synchronization check passes between Main and Tools. Dark, Light and Mono have working runtime checks. Semantic green/red finance indicators are intentional status colors, not abandoned green branding.
- Main shell passed tested 320/768/1280 widths across three themes; broader reflow checks cover 320/390/768/1024/1280. All authenticated checks cover 390 and 1280. No blanket claim about every device is made.
- The N effect is bounded pointer-driven tilt, not true volumetric 3D. It has no perpetual render loop and preserves a static image for touch/reduced motion; both animation tests passed.
- Account dropdown, PIN lock within the current tab, reload/history protection, wrong PIN, logout and remote-logout-error local cleanup passed the dedicated 16-case suite.
- Tools Chromium functional checks passed 31/31; selected Firefox and WebKit checks each passed 7/7. They cover catalogue accessibility, MFA/SSO, backup and mobile menu behavior. These are not exhaustive real-device Safari tests.
- Tools unit tests passed 53/53 after limiting workers to two. Initial unrestricted run had worker startup timeouts; those are preserved in the original log and are not counted as product defects.
- Tools browser checks exercise real generated PDF/image/QR output, OCR initialization/cancellation/restart and document workflows using test data.
- Main navigation, trading, strategy, portfolio, todo, watchlist, offline shell update and multiple finance checks passed. Supplemental selector-corrected checks also passed populated notification/search accessibility and transaction CRUD/transfer.
- SSO validates origin, source and nonce; account verification/MFA remain separate from Main's local PIN. Tokens are not placed in destination URLs.

## Validation results

| Check | Result | Evidence under `.impeccable/` |
|---|---|---|
| Main TypeScript | Pass, exit 0 | `system-audit-check-exits.json`, `system-audit-typescript.log` |
| Main build | Pass through Playwright web-server production build (E2E mode) and dedicated auth build | `system-audit-e2e.log`, `system-audit-auth.log` |
| Main native lint | Pass, exit 0; warnings include vendored skill scripts | `system-audit-check-exits.json`, `system-audit-lint-final.log` |
| Main full unit retry, two workers | **441 files passed / 5 failed; 2,760 tests passed / 7 failed**, 929.72 seconds | `system-audit-unit-retry.log` |
| Main isolated transfer unit file | 15 passed / 1 ambiguous Type selector failure | `audit-transfer-isolated.log` |
| Main four date-sensitive files with TZ=UTC | 19/19 passed; diagnostic, not a fix to normal test execution | `audit-date-utc.log` |
| Main full Chromium E2E | 104 passed / 21 failed | `system-audit-e2e.log` |
| Main selector diagnostic subset | 11/11 passed | `audit-selectors.log` |
| Main additional diagnostics | Transaction CRUD, transfer, populated notifications/search passed; contrast failed again | `audit-repros.log` |
| All dedicated authentication/menu/PIN | 16/16 passed | `system-audit-auth.log` |
| Cross-tab lock diagnostic | Gap reproduced | `audit-cross-tab.log` |
| Tools TypeScript + build | Pass | `audit-tools-build.log` |
| Tools native ESLint | Pass | `audit-tools-lint.log` |
| Tools unit retry | 53/53 passed in 11 files | `audit-tools-unit-retry.log` |
| Tools functional Chromium E2E | 31/31 passed | `audit-tools-e2e.log` |
| Tools selected Firefox / WebKit checks | 7/7 each | `audit-tools-firefox.log`, `audit-tools-webkit.log` |
| Production anonymous gates/theme | 1/1 passed; confirms current behavior, including Tools mismatch | `audit-production.log` |

### Performance measurements

- Production cold Login, 390px viewport, CPU 4× slowdown and approximately 1.6 Mbps / 150ms latency: LCP samples **5,308 / 2,320 / 2,340 ms**, median **2,340 ms**, CLS **0**. The median passes the existing 2,500ms budget, but the 5.3s outlier is retained and must not be hidden. These are laboratory samples, not field Core Web Vitals or INP measurements. The first sample overlapped the end of the unit run.
- Tools separate one-worker constrained browser test: LCP **1,748 ms**, CLS **0.0199**, tool-ready measurement **691 ms**, accumulated long-task excess **195 ms**. Passes its existing thresholds. Two Main unit workers were still active, so this is not a fully idle-host benchmark.
- Initial full-suite local Main measurements were LCP **5,096 / 5,528 ms**, CLS **0 / 0**. They failed the 4,000ms budget during parallel work. The `/projects` case in that legacy E2E-mode test resolves to Main content; it must not be described as measuring the current authenticated All hero.
- **After the unit suite completed**, the Main constrained test ran alone and passed: LCP **3,660 / 1,452 ms**, CLS **0 / 0**. Evidence: `audit-main-performance.log` and its `mobile-performance.json`. This does not convert the earlier failed run into a pass; it distinguishes test-host contention from the separate baseline.
- Idle-host Tools rerun passed: LCP **1,696 ms**, CLS **0.0199**, tool-ready **574 ms**. Evidence: `audit-tools-performance-idle/`.
- Idle-host production Login rerun passed the median budget: LCP **2,396 / 3,136 / 2,396 ms**, median **2,396 ms**, all CLS **0**. Evidence: `audit-production-performance-idle/`. All samples, including the slower middle sample and earlier 5.3s outlier, remain in the audit record.

## Scope and limits

- Build includes TypeScript for both repositories. Main native lint is Oxlint; Tools native lint is ESLint. An additional Main ESLint run with the Tools config returned 22 diagnostics, mostly unused underscore bindings, mutable declarations and one explicit any; it is supplemental, not Main's configured lint contract.
- The Impeccable static detector ran in degraded regex-only mode because parser dependencies were unavailable. Three gray-on-color candidates were reviewed: two match hover/background fragments rather than a verified bad text/background pair; the image-remove control requires rendered verification. They are not promoted to confirmed defects. CSS variables/selector contrast were instead sampled with browser/axe checks.
- No live authenticated customer records, production uploads, destructive media tests, real payment actions, cloud migrations or production mutations were performed.
- Supabase schema contains ownership RLS policies, but live policy deployment, cross-account penetration testing, backup restoration against production, native Android/Electron, and exhaustive screen-reader/manual-device testing were not verified in this run.
- Local synthetic tests validate local source. Production anonymous smoke separately confirms current sign-in/theme behavior; it does not prove every local uncommitted change is deployed.
- Diagnostic test copies are archived under `.impeccable/e2e/` so they stay outside the normal Vitest collection. Production source and the original tests were not edited.
- The unrestricted Main unit run was stopped after slow progress/resource contention and rerun with two workers. Initial failures and retry logs are retained. Performance results collected during parallel work are not treated as isolated field measurements.

## Recommended order

1. `$impeccable harden`: cross-tab lock and selected-command contrast; reconcile Tools public/account access.
2. `$impeccable harden`: deterministic regression harness and compatible dependency maintenance.
3. `$impeccable document`: current access/security/deployment documentation.
4. `$impeccable audit`: repeat the complete agreed acceptance matrix and retain failing evidence.
5. `$impeccable polish`: final visual consistency pass after functional/security work.

The fixes can be requested individually or together. This report intentionally does not implement them.
