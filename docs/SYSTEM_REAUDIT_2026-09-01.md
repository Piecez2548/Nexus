# Nexus All / Main / Tools — follow-up technical audit

Date: 2026-09-01, after deployment of AUD-001–006. Audit-only: no application source edits, dependency changes or deployments in this pass. Diagnostic scripts/results are in `.impeccable/reaudit-*`.

> **Remediation update:** the user approved all four findings after this audit. R-001 now applies idle expiry to remembered effective access and has a fresh-tab regression. R-002 changes critical-font delivery to avoid competing with entry JavaScript on constrained first visits; production remeasurement is required after deployment. R-003 now has current authenticated fixtures, updated selectors, a dedicated Playwright config and CI step; 12/12 checks pass. R-004 now runs outside the functional Tools matrix with Chromium and one worker; its isolated check passes. Final deployment evidence is recorded in `AUDIT_REMEDIATION_2026-09-01.md`; the 17/20 below remains the pre-fix audit score rather than being rewritten retroactively.

## Implementation integrity verdict

**Pass for a coherent shared implementation; not a clean bill of health.** All and Main reuse account/PIN gates; Tools intentionally exposes local utilities while retaining private API authentication. Main and Tools canonical theme files have identical SHA-256 hashes. The N hero is pointer-driven and respects reduced motion, not a looping video. One verified idle-lock defect and remaining test-coverage weaknesses prevent release-quality sign-off as 20/20.

The bundled detector returned three Main warnings and none for Tools. It explicitly ran in degraded regex mode because parser modules are unavailable; this is not evidence of comprehensive cleanliness. Context review rejected the three gray-on-color warnings as proof of a text-contrast failure: QuickAddGrid and SlipScanner findings combine hover/opacity/separate styles; MultiFileField's remove control contains an icon, not body text. Main's shared button minimum also overrides small utility dimensions. Browser axe checks supplement the detector, but do not certify every populated state.

## Audit health score

Scores apply to the sampled web implementation across the three systems, not native apps, penetration-test certification, or every possible data state.

| Dimension | Score /4 | Evidence and qualification |
|---|---:|---|
| Accessibility | 3 | No axe violations in sampled routes/dialogs; not every populated form or assistive technology verified |
| Performance | 3 | Lazy tools and bounded hero motion; live mobile login misses its existing 2.5s budget |
| Responsive design | 4 | No document overflow in the 320px All/Main route sample and 390px Tools dialogs; desktop samples also inspected |
| Theming | 4 | Shared tokens match byte-for-byte; fresh auth tests cover Light/Dark/Mono; previous shell contrast checks remain valid |
| Implementation integrity | 3 | Coherent architecture, but idle-lock edge case and dormant/flaky regression coverage remain |
| **Total** | **17/20 — Good** | **Address findings below; not 20/20** |

## Executive summary

Four findings: **P0: 0, P1: 1, P2: 3, P3: 0.** First fix Main's remembered-tab idle lock. Then improve live login startup and restore/isolate regression coverage. Tools has no newly reproduced public-access or dialog accessibility blocker; its finding concerns performance-test reliability, not a demonstrated production slowdown.

## Findings

### R-001 [P1] Main auto-lock skips a new tab admitted through Remember

- Location: `src/store/appLock/pinLockSlice.ts:182–186`; admission through Remember at lines 45–50. `AppLockGate.tsx` installs the interval when unlocked.
- Category: implementation integrity / security behavior.
- Reproduction: set a PIN with Remember, open a fresh tab (no session unlock), set idle auto-lock to one minute, let the inactivity deadline elapse. The store admits access through `rememberUntil`, but `checkAutoLock()` returns early because `sessionUnlocked` is false. The diagnostic reproducer verified `isLocked()` remains false after the deadline.
- Impact: on an unencrypted remembered session, Main can remain visible after the selected idle deadline. This does **not** invalidate the successful explicit All cross-tab lock fix. Encrypted fresh tabs still require a DEK/PIN through the additional encryption gate.
- Standard: application security expectation, not a WCAG finding.
- Recommendation: evaluate effective unlocked access rather than only the session flag; preserve encryption checks and disabled-auto-lock semantics. Add fresh-tab Remember + elapsed-idle regression coverage, including cross-tab effects. Consider expiration without user events in the same regression group.
- Suggested command: `$impeccable harden`.
- Evidence: `.impeccable/reaudit-lock.repro.ts`, `.impeccable/reaudit-lock.log`. Executed as a temporary diagnostic test, then renamed out of normal test discovery. It asserts the observed defect, not acceptance of desired behavior.

### R-002 [P2] Live All login narrowly misses its mobile startup budget

- Location: production `/projects`; `e2e/production-smoke.spec.ts:44–58`.
- Category: performance.
- Measurement: Chromium, 390×844, CPU 4× slowdown, 150ms network latency, 200,000 B/s download, cold cache and blocked service worker. Three samples: **2,640 / 2,700 / 2,756ms LCP**, median **2,700ms**, against the existing **<2,500ms** test target. CLS was **0** for all three. No retry was used to obtain a passing result.
- Impact: login becomes visible slightly later on a constrained mobile connection. Anonymous auth behavior passed; this is not a login failure.
- Standard: existing project performance budget. A synthetic lab run is not field Core Web Vitals or evidence every user is slow.
- Recommendation: inspect the recorded resource waterfall, prioritize the largest login element's dependency chain, and reduce unnecessary startup code/font work. Preserve the target; verify improvements using the same three-sample setup.
- Suggested command: `$impeccable optimize`.
- Evidence: `.impeccable/reaudit-production.log` and `reaudit-production/**/production-summary.json`, resource waterfalls alongside it.

### R-003 [P2] All's dedicated layout suite is excluded and lacks current auth setup

- Location: `playwright.config.ts:5`, `e2e/project-hub.spec.ts:10–28`, `.github/workflows/ci.yml`.
- Category: implementation integrity / regression coverage.
- Verified code: the default suite excludes `project-hub.spec.ts`. CI explicitly runs auth-entry and login configs, but has no equivalent project-hub suite invocation. The hub suite opens `/projects/index.html` and immediately expects `.hero-image`, without establishing an authenticated fixture, even though the current route requires login. It also contains historical static-page resource assumptions.
- Impact: its five-width layout, expanded-text and dedicated hero checks are not protecting CI. Fresh auth-entry coverage is useful but does not replace this complete layout suite. This is a test-maintenance gap, not a claim that the current All layout is broken.
- Standard: project regression coverage, not WCAG nonconformance by itself.
- Recommendation: share the synthetic auth fixture, update obsolete static-page assumptions, run the All layout suite with an explicit config in CI, and retain its accessibility/text-scaling coverage.
- Suggested command: `$impeccable harden`.

### R-004 [P2] Tools performance budgets still run alongside functional browser tests

- Location: `D:/Project_001/Nexus-Tools/playwright.config.ts` (`fullyParallel: true`, two workers, three desktop browser projects), `e2e/release-performance.spec.ts`, `.github/workflows/ci.yml` (`npm run test:e2e`).
- Category: performance / implementation integrity of measurements.
- Verified code: the CPU/network-throttled performance case has no opt-in/isolation condition and is included in the normal suite. Its timing can compete with other browser tests. Main now isolates its equivalent case; Tools does not.
- Impact: avoidable timing variation can produce unreliable CI/deployment-gate results. This audit did **not** reproduce a Tools production performance failure, so the finding is explicitly a harness reliability risk.
- Standard: repeatable performance measurement; not a user-visible defect or WCAG violation.
- Recommendation: separate Tools timing checks from functional cases and run them with one worker after functional tests, keeping existing thresholds. Keep the cross-browser functional coverage.
- Suggested command: `$impeccable optimize`.

## Positive findings and validation

- Fresh authentication suite: **17/17 passed**, including explicit All lock → other Main tab lock → reload remains locked → correct PIN unlock, and logout failures clearing local access.
- Fresh Main/All route scan: **28 routes** (All + 27 Main), at 320×844, synthetic authenticated local data, zero reported axe violations and no document overflow in sampled initial states. This does not cover every populated record/drawer.
- Live anonymous Tools: catalogue mobile/desktop plus **17 initial tool dialogs** at 390px, zero reported axe violations and no document overflow. No customer files were uploaded and no private cloud writes performed.
- Public production smoke passed: anonymous Main goes to All login, Tools renders 17 tools without login, private cloud-book API returns 401.
- Fresh full npm audit: **0 known advisories** in Main and Tools. This does not guarantee absence of unknown vulnerabilities.
- Theme copies have identical SHA-256 `1380E1D8A46548F4E36B8A3826F98082088E2659D0FE36898BC87C237C75691D`; Tools already provides a theme-sync/check script, so duplicated delivery is not itself reported as drift.
- All hero uses an optimized static monogram, pointer-only transforms, no idle animation loop, and a reduced-motion alternative. Desktop/mobile screenshots reviewed; black-purple identity is preserved.
- Previous completed remediation evidence (full units/build/TS/lint and shell tests) remains in `AUDIT_REMEDIATION_2026-09-01.md`. It is not represented here as freshly rerun. No full 2,769-test run or new deployment was needed for this report-only pass.

## Patterns, limits and next actions

The remaining pattern is **edge-state and harness coverage**, not a need to redesign all three interfaces. Shared entry paths are well covered; remembered fresh tabs and excluded/parallel timing suites need attention. Color detector warnings must be checked against actual cascade and rendered state before treating them as bugs.

1. **[P1] `$impeccable harden`** — R-001 remembered-tab auto-lock.
2. **[P2] `$impeccable optimize`** — R-002 login waterfall and R-004 Tools timing isolation.
3. **[P2] `$impeccable harden`** — R-003 All authenticated layout suite and CI wiring.
4. **`$impeccable polish`** — final visual verification after fixes, without replacing the approved identity.

Re-run `$impeccable audit` after fixes. Work can be requested individually, together, or in another order. Native devices, real-account penetration testing, full assistive-technology coverage and field performance remain outside this bounded web audit.
