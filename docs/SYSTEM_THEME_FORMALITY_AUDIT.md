# Nexus — Theme consistency and professional presentation audit

## Approved static All redesign — 2026-08-31

The user approved the static N mockup and requested implementation. Replaced conductor media and animated decoration with a 106.6KB decorative WebP, clear typographic hero and horizontal Main/Tools navigation rows. Removed the obsolete playback controller. Responsive tests cover 320–2560px, image failure, keyboard access, no MP4 requests and no active animations; existing reflow checks include 200% text. Account/authentication architecture is preserved. This supersedes the video-related visual recommendations below; no new numerical score is assigned.

## Playback performance correction — 2026-08-31

User-reported lag was reproducible. In Chromium at 1920×1080 with 4× CPU throttling, a six-second sample before the correction dropped 79 of 182 video frames; after removing expensive filters, masking and blend passes, it dropped 2 of 182. Animation-frame p95 improved from 83.3ms to 16.8ms; intervals over 50ms fell from 28 to zero. Both samples used the same video and test (`e2e/conductor-performance.spec.ts`); artifacts are `.impeccable/glow-before` and `.impeccable/glow-after`. These are single controlled samples, not a guarantee for every device or a new 20/20 score. Purple light and actual human movement remain.

## Conductor-video follow-up — 2026-08-31

The user supplied footage for real human movement on All. Added a cropped, purple, silent MP4 loop with a poster, explicit pause/resume, offscreen/hidden-tab suspension and no video fetch for initial Reduce Motion. Reused the existing motion controller; authentication is unchanged. Build/TypeScript and scoped lint passed, ProjectHub unit checks passed, all 84 route/mode axe scans passed. Production login gating and MP4 delivery verified. See deployment documentation and `.impeccable/conductor-*.log` for evidence; the earlier 20/20 applies to its recorded scope, not a new measured performance guarantee for video playback.

## Black–purple follow-up — 2026-08-31

User explicitly superseded green branding and requested the original background restored. Canonical Main/All/Tools tokens now use black–purple, with the existing responsive hero restored using CSS hue rotation and masking. Login artwork matches; no auth/PIN/MFA behavior changed. Both sites deployed READY; see PROJECT_HUB_DEPLOYMENT.md.

The scoped criteria below remain supported: fresh 84 route/mode axe scans, responsive/contrast checks, PIN confirmations and 13 auth cases passed. Main related unit tests 47 passed; Tools 53 unit and 7 theme/axe tests passed. Main's initial two PIN failures were outdated white/green RGB assertions, updated to the new tokens and confirmed. Both builds and native lint passed; scoped current-test ESLint passed. The separately checked legacy project-hub spec has six pre-existing explicit-any lint findings, not claimed fixed.

Actual production cold-login LCP 2516 / 2364 / 2392 ms, median **2392 ms**, CLS **0** in each sample. Median <2500 ms still passes; the slower sample remains recorded. Desktop/mobile restored-background screenshots were visually inspected. This follow-up does not expand the previous score's scope or imply every state/device is certified.

## Previous final scoped audit — 2026-08-31

**20/20 against the defined engineering audit criteria; deployed.** This supersedes the historical scores below. It does not mean flawless performance for every visit, universal WCAG conformance, or actual screen-reader speech certification.

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 4/4 within inspected scope | Existing 84 axe scans; keyboard validation, populated save, focus restoration, nested-modal and error-association checks retained; final keyboard regression passed |
| Performance | 4/4 against the stated lab median budget | Production cold-login median **2376 ms**, below 2500 ms; CLS **0** in all samples; prior Tools measurements and lazy workspaces retained |
| Responsive | 4/4 | Prior 320–1920px / 200% reflow checks plus final mobile/desktop theme/PIN regression |
| Theming | 4/4 | Canonical Main/All/Tools token synchronization check passed; Dark/Light/Mono/System regressions and production palette checks passed |
| Implementation integrity | 4/4 within changed scope | Shared lookup logic, unchanged account/MFA/PIN rules, guarded async Sync; TypeScript/build, scoped ESLint, related unit and browser suites passed |
| **Total** | **20/20** | **Scope and sampling limitations below remain applicable** |

### Final changes

- Deferred the Sync engine until the existing async sync action actually runs, after signed-in/concurrent-sync guards. Failure handling and timestamps remain unchanged; concurrent sync regression waits for asynchronous module loading and still verifies a single invocation.
- Entry screens load only existing core/security dictionaries. A shared synchronous lookup helper serves both entry and full-app translation APIs, preserving interpolation, missing-key behavior, persisted language and instant English/Thai switching. Main dictionaries remain unchanged and are loaded with Main consumers.
- Entry JS after Sync splitting was 452.54 kB / 114.80 kB gzip; the additional dictionary split reduced it to 225.44 kB / 67.49 kB gzip. No visible content was replaced with placeholders to improve LCP.

### Final measurements and validation

Profile unchanged: 390×844, CPU 4×, download 200000 B/s, upload 93750 B/s, latency 150 ms, cache disabled and service workers blocked, actual anonymous production login. The acceptance criterion established above was **median of three cold samples <2500 ms**, not every sample or field p75.

- First production set after the dictionary split: **2924 / 2364 / 2420 ms**, median **2420 ms**, CLS 0. An exploratory stricter per-sample assertion failed on the 2924 ms outlier; that failed result is retained in `.impeccable/production-target20.log`.
- Independent confirmation: **2352 / 3016 / 2376 ms**, median **2376 ms**, CLS 0. The final regression measures three isolated contexts in one test and asserts the predefined median budget, retaining every sample without retries. It replaces the former broad 4000 ms safety budget. The 3016 ms outlier is not discarded: some visits can still exceed 2.5 seconds. Across all six samples the median is 2398 ms.
- Main related unit tests: **101 passed**, plus the new entry-language parity test **1 passed**. Auth-entry **13 passed**. Final theme/PIN/keyboard/readiness **14 passed**. Final production gate/theme and three-sample median checks **2 passed**. Tools was unchanged this pass; its prior 53 unit / 29 browser results remain the latest applicable evidence.
- TypeScript + build passed; scoped ESLint and native lint passed (historical skill-script warnings remain). Canonical theme synchronization passed. Historical unrelated full-source ESLint findings are not represented as fixed.
- Evidence: `.impeccable/build-entry-dictionary.log`, `test-entry-dictionary.log`, `test-entry-parity.log`, `eslint-entry-dictionary.log`, `auth-entry-final.log`, `regression-entry-dictionary.log`, `production-target20.log`, `production-audit-confirm.log`, and `.impeccable/production-audit-confirm/**/production-summary.json` / per-sample waterfalls.

Production Main/All: **READY**, `dpl_93h4NHCZqdTXyD58P4QrsTsDt7yJ`, https://nexus-l3hgze02c-piecez2548s-projects.vercel.app, aliased to https://nexus-lemon-eight-32.vercel.app. Tools remains READY at `dpl_HGpCihcZJ959BW2kBwQzumRyicmR`, https://nexus-tools-chi.vercel.app. See PROJECT_HUB_DEPLOYMENT.md.

## Historical production follow-up — 2026-08-31

**Deployed; goal not yet fully reached. Latest scoped engineering score: 19/20.** This supersedes the historical local-only status below. It is not a claim of universal WCAG conformance, real screen-reader speech testing, or perfect performance in every state.

| Dimension | Score | Current evidence |
|---|---:|---|
| Accessibility | 4 within inspected scope | Prior 84 default-state axe scans plus keyboard validation/save/focus restoration, manually reviewed accessible-tree output, error associations, and topmost-only nested-modal tests |
| Performance | 3 | All CLS fixed; per-tool/Main/monitoring code splitting verified; production cold-login median LCP remains 2756 ms under the defined constrained profile |
| Responsive | 4 | Existing 320–1920px and 200% representative reflow checks retained; theme/PIN regression rerun |
| Theming | 4 | Shared foreground/background/control contract, mode handoff, scoped CSS and current production smoke checks |
| Implementation integrity | 4 within inspected scope | Shared fixes reused; account/PIN/MFA ordering preserved; local and cloud builds plus scoped lint pass |
| **Total** | **19/20** | **20/20 remains an unmet target; no score inflation** |

### Additional fixes and verification

- FormField now links errors through `aria-describedby`, exposes `aria-invalid`, and announces messages with `role=alert`, including nested inputs. A regression test preserves pre-existing descriptions and input state as errors appear/disappear.
- Both modal hooks maintain a stack so Escape closes only the top overlay, then restores the correct trigger. Nested overlay tests pass in both repositories.
- Browser keyboard workflow passes: submit an empty account, inspect the accessible validation tree, wrap Tab/Shift+Tab, save a named account, verify populated content and trigger-focus restoration. This reviews the accessibility tree consumed by assistive technology; **no actual NVDA/JAWS/VoiceOver speech run is claimed**.
- All previously injected CSS in an effect, causing a measured startup CLS of 0.827. Loading its scoped stylesheet before mounting reduced CLS to 0. Main route modules are now lazy while preserving AccountRouteGate → AppLockGate → SyncProvider/MainLayout ordering. Fonts preload from existing same-origin assets.
- Login now consistently identifies Nexus All and uses formal workspace copy.
- Optional Sentry SDK is deferred behind narrow exports, with bounded early-error buffering and no default PII collection. Unconfigured, configured-startup, buffered error and boundary-fallback tests pass. Startup cloud chunk decreased from about 290 kB to 205 kB; the approximately 85 kB monitoring chunk is deferred.
- Tools Vercel function compilation initially emitted ES-library diagnostics. Root tsconfig now matches ES2023; the final cloud build no longer emits those errors.

### Results and artifacts

- Main theme/accessibility/reflow cases passed; header tests initially had an ambiguous `Account` locator after filters gained labels. Using the exact accessible name resolved this test ambiguity; all four header cases then passed, including populated budget alerts/search and PIN locking.
- Final auth-entry suite: **13 passed**. Tools unit suite: **53 passed**. Tools theme/accessibility/functional/auth suite: **29 passed**.
- Main readiness/route-split suite: **14 passed**. Focus/error/nested-modal and monitoring-specific unit tests also passed; scoped ESLint and TypeScript/build passed. Historical unrelated full-source ESLint findings listed below remain outside this patch.
- Final production smoke suite: **6 passed** across three fresh contexts. Anonymous Main and Tools entries correctly reach All login; fresh clients receive the Nexus All label and current charcoal palette.
- Local constrained Tools sample: LCP 1628 ms, CLS 0.0199, cold QR panel readiness 682 ms. Local authenticated Main dashboard sample after route splitting: LCP 740 ms, CLS 0. Local All sample: LCP 3036 ms, CLS 0. These scenarios are not interchangeable.
- Production cold-login profile: 390×844, 4× CPU slowdown, 200000 B/s download, 93750 B/s upload, 150 ms emulated latency, browser cache disabled, service workers blocked. Samples **2800 / 2756 / 2684 ms LCP; CLS 0**. Median 2756 ms; target 2500 ms is **not met**. Cold panel readiness is not INP; no field percentile or real-device performance claim is made.
- Evidence: `.impeccable/release-confirm.log`, `.impeccable/release-route-split.log`, `.impeccable/release-auth-final.log`, `.impeccable/release-header-confirm.log`, `.impeccable/release-monitor-buffer.log`, `.impeccable/release-final-build.log`, `.impeccable/production-final.log` and `.impeccable/production-final/**/production-mobile.json`; Tools `release-unit.log`, `release-regression.log`, `release-performance.log`, `release-deploy-final.log`.

### Deployment and remaining target

Main/All: `dpl_DZmTUY5KkCUHNDRx1B2ApdLrTwx2`. Tools: `dpl_HGpCihcZJ959BW2kBwQzumRyicmR`. Both READY and aliased to their existing production domains; see PROJECT_HUB_DEPLOYMENT.md.

The remaining performance point requires further measured reduction of the cold startup dependency path, not relaxing the 2500 ms target or hiding latency with a placeholder. The current waterfall includes roughly 70 kB transferred shared translation code, 61 kB React runtime and 54 kB cloud runtime; assess that path before additional changes. Any language-loading refactor must preserve synchronous translation callers and persisted locale behavior. Continue with `$impeccable optimize`, then re-audit and finish with `$impeccable polish`.

## Implementation follow-up — 2026-08-31 (local, not deployed)

The fixes below supersede the repeat-audit findings where stated. **Evidence-supported score: 18/20, not an unconditional 20/20.** Accessibility and performance remain 3/4 because automated checks and local builds cannot establish full assistive-technology behavior or real-device runtime performance. Responsive, theming and implementation integrity are 4/4 within the tested default-state scope. This is not a WCAG certification, nor coverage of every populated data state.

### Implemented

- THEME-001/002: replaced legacy primary action class combinations across 73 TSX files with the shared action style. It pairs correct foreground/background colors in Light/Dark/Mono, with 48px minimum height and 12px radius. Regression tests verify contrast ≥4.5:1 and dimensions, including account-drawer opening/Escape. Semantic status text on Dashboard, Trading and Workouts now uses readable hues; chart fills remain unchanged.
- THEME-003: All now introduces the Nexus workspace with clear Main/Tools choices. Removed decorative hero media/trail from markup and excessive reserved scene space. Updated historical hero tests for the new static presentation. PIN requirements remain explicit in the entry copy.
- THEME-004: Tools metadata in tools.css is now at least 13px; primary actions match 48px/12px and other buttons have 44px minimum targets. Category colors remain meaningful.
- THEME-005: retained level/progress functionality but removed the flame from the top-bar trigger and reduced accent emphasis. Details remain available in the existing panel.
- THEME-006: Main content buttons now have 44px minimum targets. Added accessible names to transaction/trading filter selects and gallery file input after the expanded axe pass exposed missing labels.
- THEME-007: validated Main-to-Tools session handoff now carries Dark/Light/System/Mono; Tools persists only allowed values and follows system media changes. Origin/source/nonce checks and authentication gates remain. Synchronization is on authenticated launch, not continuous bidirectional updates across independent tabs.
- THEME-008: synchronized Login color guidance with canonical tokens and documented intentional typography roles. Updated Main design reference, shared-theme documentation and Tools README.
- Performance: split Tools feature panels with lazy imports and a localized loading state while keeping the dialog header/close control mounted. ToolWorkspace shell changed from 515.43 kB to 3.91 kB minified. Feature/vendor code is deferred, not eliminated. Largest ordinary JS chunk is about 445 kB; PDF workers remain larger and load for PDF tasks. The build no longer reports the 500 kB chunk warning.

### Validation evidence

| Check | Result |
|---|---|
| Main TypeScript + Vite E2E build | Passed via Playwright server command |
| Main theme/PIN regression | 12 passed |
| Primary action contrast/dimensions, three modes × two widths | 6 passed |
| axe across 27 Main routes + All, Light/Dark/Mono at 390px | 3 passed, covering 84 page scans; no reported A/AA violations in loaded default states |
| Reflow at 320/390/768/1280/1920, plus 200% text on four representative pages | Passed |
| Main focused unit/integration rerun | 16 passed across four matching test files |
| Main scoped ESLint on changed action components and follow-up files | Passed |
| Main native `npm run lint` (oxlint) | Passed with existing warnings in skill scripts |
| Main full-source check using Tools' external ESLint rules | 22 pre-existing errors outside this theme patch; not described as passing |
| Tools TypeScript + build + ESLint | Passed |
| Tools unit suite / SSO theme rejection-and-acceptance test | 52 passed / 2 passed |
| Tools theme regression | 4 passed |
| Tools catalogue axe in Dark/Light/Mono | 3 passed |
| Tools functional browser tests, including PDF/image/QR/OCR/invoice/auth | 22 passed |
| Canonical theme/font synchronization | Passed |

Relevant logs: `.impeccable/formal-confirm.log`, `.impeccable/formal-all-confirm.log`, `.impeccable/formal-reflow.log`, `.impeccable/formal-final-unit.log`, `.impeccable/formal-scoped-eslint.log`, `.impeccable/formal-final-eslint.log`; Tools `formal-build-final.log`, `formal-workspaces.log`, `formal-a11y.log`, `formal-unit.log`, `formal-sso.log`, `formal-lint-complete.log`.

The bundled detector still runs with degraded HTML parsing; its remaining advisories are not accepted as computed contrast evidence. No detector suppression was added to obtain a higher score. The browser axe checks provide the contrast/label evidence above.

### Remaining work before claiming 20/20

1. Complete manual keyboard/screen-reader review of populated tables, validation errors, nested dialogs and asynchronous loading states across Main and Tools; default-state axe scans alone do not establish this. Follow-up command: `$impeccable harden`.
2. Profile startup and first tool interaction under representative mobile CPU/network conditions, including PDF/OCR workers; chunk splitting alone is not a Core Web Vitals measurement. Follow-up command: `$impeccable optimize`.
3. Re-audit those results and finish with `$impeccable polish`. Do not raise the score merely to meet the requested number.

No production deployment or authentication-policy change was made in this follow-up. Previous production screenshots/releases below describe an older version.

Date: 2026-08-31. Report only; no application code, authentication behavior, or deployment changed in this audit.

## Repeat audit — 2026-08-31

**Verdict unchanged: shared foundation passes, complete component consistency does not.** The provisional score remains **11/20** (Accessibility 2, Performance 2, Responsive 3, Theming 2, Integrity 2). This repeat is a technical audit, not a fresh full visual critique. The original measurements below remain historical where not explicitly rerun.

### Fresh verification

- Main: `npx playwright test e2e/main-theme.spec.ts --project=chromium --workers=2` — **12 passed**. The configured server command also completed TypeScript/build in E2E mode. Tests cover representative route backgrounds/fonts, dark/light/mono, system switching, PIN, mobile/desktop overflow and Trading dialog Escape. They do not check every button's contrast.
- Tools: `node scripts/sync-theme.mjs --check` succeeded; `npx playwright test e2e/theme.spec.ts --project=chromium-tools --workers=2` — **4 passed**, using the existing local build and mocked authentication fixture. Verified dark/light theme, font, accent and overflow at 390/1280px. Reviewed the fresh mobile light screenshot. Tools was not rebuilt in this pass.
- Re-scanned all Main `src` and Tools `src`, expanding the previous Main detector scope. Main returned **12 candidates**, Tools returned **0**. The detector reported **DEGRADED HTML parsing**, falling back to regex without computed contrast/selector evaluation. Results are incomplete screening evidence.
- The light-mode Accounts button still has `bg-brand-600 text-zinc-900 dark:text-white`; the original 2.66:1 pair is not fixed. Search still finds **31 matching lines across 30 files**. This pass confirms source persistence; it did not independently remeasure Accounts in a live browser.
- Dashboard/Accounts action variants, personal portfolio copy in All, level/flame markup, Tools small typography and independent theme preferences remain in source. Prior mobile target counts were not remeasured.
- Motion review: Main uses a targeted reduced-motion override; All replaces the trail animation with a static treatment. Tools globally disables CSS transitions/animations under reduced motion. No broken state feedback was demonstrated, so this is a follow-up check, not an additional confirmed defect.
- Logs: `.impeccable/re-audit-main-e2e.log`; detector JSON files `.impeccable/re-audit-main-detector.json` and `.impeccable/re-audit-tools-detector.json`; Tools `re-audit-theme.log`. Screenshots are under each test output directory.
- No application edits/deployments. Full ESLint/unit suites, runtime performance profiling, every Tools workspace and production authentication were not rerun.

### Detector triage

| Candidates | Disposition |
|---|---|
| MultiFileField red remove button | Real class pairing at `src/components/ui/MultiFileField.tsx:54`, with a 20px button. Review alongside THEME-006; no new contrast violation claimed without computed-state measurement. |
| QuickAddGrid and SlipScanner gray-on-red | Detector combines normal foreground with hover background but omits simultaneous `hover:text-red-400` and `/20` alpha. Reject the reported solid gray-on-red pairing; hover contrast still merits actual measurement. |
| Login `#000` | False positive as a visible palette violation: black is used in `mask-image`, not text or surface color. |
| Eight Login font-size advisories | Real CSS sizes outside the sparse documented ramp, but not eight user-facing defects. Consolidate into documentation drift below; do not change brand/title/body sizes merely to silence the detector. |

### THEME-008 — P3: Login design reference is stale

- Category: implementation integrity / documentation.
- Location: `src/features/sync/components/DESIGN.md:5` and its typography section.
- Evidence: reference primary/background remain `#53f5a0` / `#070d0b`, whereas current shared dark tokens are `#55d995` / `#0b0e0d`. The documented type ramp omits several incumbent component sizes.
- Impact: future edits or automated checks can follow obsolete guidance and recreate theme divergence.
- Recommendation: document the current shared tokens and intentional typography roles; do not alter working UI to match the old document. Suggested command: `$impeccable document`.

The cumulative register now contains **8 issues: P0 0 / P1 1 / P2 5 / P3 2**. Existing design judgments are retained, not reclassified as automated failures. Prioritize THEME-001, then common controls and mobile targets; synchronize documentation before a final `$impeccable polish`. Re-run `$impeccable audit` after fixes. Actions can be requested individually or together.

## Verdict

**Implementation integrity: not yet a fully coherent system.** Main, All and Tools share the same palette and fonts, but their controls and presentation still differ. The neutral palette is a suitable foundation; another wholesale color change is not the priority. Normalize controls, repair light-mode contrast, and align product language first.

The bundled detector returned no findings for Main layouts, Dashboard and Tools. Manual source inspection and rendered browser measurements nevertheless confirmed the issues below. An empty detector result is not proof of visual consistency.

## Scope and limitations

- Verified exact shared-theme/font parity using Tools' `scripts/sync-theme.mjs --check`.
- Inspected rendered Main pages in the local preview of the existing E2E build, waiting for each page heading: dashboard, finance, transactions, favorites, accounts, net-worth, subscriptions, categories, merchants, budget, goals, recipients, reports, executive, ai-analytics, trading, trading/journal, trading/portfolio, trading/strategies, trading/watchlist, trading/economic-calendar, todo, habits, schedule, vault, workouts, settings — **27 routes**.
- Inspected All locally and reviewed its source. Mobile sample at 390×844: dashboard, accounts, transactions, trading, reports, settings and projects.
- Inspected Tools theme/control CSS and login/PIN sources; reused the latest neutral-theme PIN screenshot for visual confirmation. This round did **not** open every Tools workspace or reauthenticate against production.
- Measurements concern loaded default page states, not every drawer, error, populated chart, or account state. No complete keyboard/screen-reader, 200% text scaling, or Core Web Vitals audit was performed.
- Some in-app screenshot captures did not match the viewport framing. Those capture artifacts are not reported as application overflow; overflow findings below use DOM measurements.
- No application code changed, so Build/TypeScript/ESLint/unit/E2E suites were not rerun in this report-only pass. Previous passing runs do not establish full visual correctness.

## Audit health score

Scores describe this limited inspection, not compliance certification. Performance is provisional because runtime profiling was outside this pass.

| Dimension | Score / 4 | Evidence |
|---|---:|---|
| Accessibility | 2 | Confirmed low-contrast primary action in light mode; several small controls |
| Performance | 2 (provisional) | Route lazy loading exists; earlier Tools build reports a large workspace chunk; no fresh runtime benchmark |
| Responsive design | 3 | No horizontal overflow on measured pages; mobile target sizes need attention |
| Theming | 2 | Shared palette/fonts verified, but component token usage differs |
| Implementation integrity | 2 | Repeated button drift and inconsistent product presentation |
| **Total** | **11/20** | **Acceptable foundation; significant consistency work remains** |

Found **7 issues: P0 0 / P1 1 / P2 5 / P3 1**. Visual/formality judgments are explicitly separated from measured defects below.

## Findings

### THEME-001 — P1: Light-mode action text has insufficient contrast

- Category: accessibility / theming.
- Location: `src/features/finance/pages/Accounts.tsx:39`; similar classes occur in finance pages/forms.
- Verified browser result: เพิ่มบัญชี uses background `#176b3b` with foreground `#181a1b` in light mode. Calculated sRGB contrast is **2.66:1**, below the 4.5:1 normal-text target.
- Impact: the principal action is harder to identify and read. Dark mode's white foreground hides this problem during dark-only reviews.
- Source search found **31 matching lines** for `bg-brand-600.*text-zinc-900` across Main. These are review candidates, not 31 separately verified failures.
- Recommendation: use semantic primary-action foreground/background pairs; check default, hover, disabled and focus states in light/dark/mono before replacing classes broadly.
- Suggested command: `$impeccable harden`.

### THEME-002 — P2: Primary actions differ across Main pages

- Category: theming / implementation integrity.
- Locations: `src/features/dashboard/components/DashboardHeader.tsx:33`, `src/features/finance/pages/Accounts.tsx:39`, `src/features/trading/components/TradingWorkspaceHeader.tsx`.
- Measured dark-mode examples: Dashboard primary is `#55d995`, 48px tall; Accounts primary is `#176b3b`, 40px tall; Trading primary is `#176b3b`, 48px tall.
- Impact: equally important actions look like different priority levels and separate products. Shared color variables alone do not solve this.
- Recommendation: one primary button specification and explicit compact/secondary variants, reusing existing UI primitives. Preserve semantic red/green for financial data.
- Suggested command: `$impeccable polish`.

### THEME-003 — P2: All's content communicates a personal portfolio

- Category: implementation integrity; **editorial/design judgment**, not a functional defect.
- Location: `src/features/projects/projectHub.html:20`, `:21`, `:37`, `:39`.
- Evidence: “Ideas into everyday possibilities”, “รวมโปรเจคที่ผมสร้าง”, and “A personal collection. Always growing.” The decorative hero reinforces a creative portfolio identity.
- Impact: this does not express the user's intended formal entry point for a unified system; the oversized introduction also precedes the actual choices users need.
- Recommendation: present All as the Nexus workspace entry point, explain Main/Tools clearly, prioritize application access, and reduce decorative hero dominance. Example heading: “พื้นที่ทำงาน Nexus”; supporting copy: “เข้าถึงข้อมูลและเครื่องมือของคุณจากศูนย์กลางเดียว”. Do not invent enterprise claims or certifications.
- Suggested commands: `$impeccable clarify`, `$impeccable quieter`.

### THEME-004 — P2: Tools' control typography needs a clearer hierarchy

- Category: implementation integrity / typography; partly design judgment.
- Location: `D:/Project_001/Nexus-Tools/src/tools.css:159`, `:172`, `:181`, `:206`, and category icon styles.
- Evidence: multiple 10–12px text rules, plus independently sized/radiused surfaces and colorful category icon treatments. These are source observations; not every selector was visually assessed in every workspace.
- Impact: the interface can feel denser and more playful than Main/All despite matching fonts. Small secondary labels merit readability review.
- Recommendation: align normal labels, metadata, section headings and control dimensions with Main. Keep category colors where informative, but limit their visual area; do not repaint previews or user content. Small metadata is not automatically a WCAG violation.
- Suggested commands: `$impeccable typeset`, `$impeccable quieter`.

### THEME-005 — P2: Gamification competes with the professional shell

- Category: implementation integrity; **design judgment**.
- Location: `src/layouts/LevelBadge.tsx:31` and `:34`.
- Evidence: level and flame/streak indicators occupy the shared top bar.
- Impact: the emphasis suits a personal productivity app, but competes with navigation/account information in a formal financial workspace.
- Recommendation: retain existing behavior and data, but move progress details into the profile or personal area, or reduce their prominence. No removal of business logic is required.
- Suggested command: `$impeccable distill`.

### THEME-006 — P2: Several mobile controls fall below the 44px comfort target

- Category: responsive design.
- Locations: main-content controls on Dashboard, Accounts, Transactions and Settings; review associated page/component markup.
- At 390×844, visible main-content buttons/links with either dimension under 44px: Dashboard 15, Accounts 7, Transactions 3, Settings 11. Trading, Reports and All returned 0 under the same scan.
- Impact: small controls can be difficult to tap accurately.
- These are **screening counts**, not individual accessibility violations. A 44×44px comfort target is not the same as WCAG AA's target-size rule; spacing exceptions and actual hit areas must be checked per control.
- Recommendation: increase interactive padding without enlarging decorative icons, and check dense filters/info controls on real touch layouts.
- Suggested command: `$impeccable adapt`.

### THEME-007 — P3: Theme selection does not follow users between origins

- Category: theming.
- Location: `docs/SHARED_THEME.md`, Main ThemeEffect and Tools ThemeEffect/preferences.
- Evidence: Main/All share a saved preference; Tools stores its own preference and supports Dark/Light only. Main also supports System/Mono.
- Impact: moving between applications can change appearance even when both implement the same palette. This is an existing documented limitation, not a newly introduced regression.
- Recommendation: decide on a common mode contract and, if needed, explicit secure synchronization. Do not use this work to weaken authentication or PIN checks.
- Suggested command: `$impeccable harden`.

## What is already working

- Palette and self-hosted fonts match across repositories; theme drift can be checked deterministically.
- Neutral canvas, restrained green and charcoal surfaces provide a credible professional base.
- Updated PIN presentation is simple and readable; the latest reviewed screenshot no longer shows the old purple/black-heading mismatch.
- None of the 27 measured desktop page states or seven mobile samples showed horizontal document overflow.
- Financial status, chart series and tool categories retain meaningful colors; uniform branding should not erase those distinctions.

## Recommended sequence

1. **P1 — `$impeccable harden`**: repair light-mode foreground/background pairs and verify their interaction states.
2. **P2 — `$impeccable clarify` / `$impeccable quieter`**: make All a formal workspace entry point; reduce portfolio language and decorative emphasis.
3. **P2 — `$impeccable typeset` / `$impeccable distill`**: unify Main/Tools typography and reduce peripheral gamification emphasis, preserving functionality.
4. **P2 — `$impeccable adapt`**: verify and repair undersized mobile hit areas.
5. **P3 — `$impeccable harden`**: address cross-origin mode continuity only after defining expected behavior.
6. Re-run `$impeccable audit`, including authenticated Tools workspaces, forms, keyboard navigation and text scaling. Run required build, TypeScript, ESLint and related tests after implementation.
7. **Final pass — `$impeccable polish`**: align primary/secondary buttons, spacing, radii and heading hierarchy across representative screens.

These actions can be requested individually, together, or in another order. The current report does not authorize or perform a redesign/deployment.
