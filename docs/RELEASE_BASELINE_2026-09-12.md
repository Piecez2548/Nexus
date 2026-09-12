# Nexus Release Baseline — 2026-09-12

**Recorded at:** 2026-09-12 (Asia/Bangkok)  
**Scope:** This Nexus repository and its Android debug wrapper  
**Decision:** **BASELINE CAPTURED — RELEASE GATE FAILED**

This record started from the working-tree snapshot captured before this report file was added. The TEST-STABILITY-001 remediation below is bound to the follow-up fingerprint recorded in Section 1. It is an engineering baseline, not approval for a real-data pilot, commercial launch, legal compliance, security certification, or production Android distribution.

## 1. Source identity

| Field | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `efdebc43b58a4adbc121d90ec5dfe2e857f1ee4a` |
| HEAD authored | `2026-08-31T13:47:38+07:00` |
| HEAD subject | `Hand off authenticated Nexus sessions to Tools through verified popup messages` |
| Tracked modified/deleted paths | 173 |
| Untracked files | 1,198 |
| Files included in snapshot fingerprint | 2,655 |
| Working-tree SHA-256 | `b9db6d46665c7569794255da7674e4a7a4107862e43d1f36b5f1f25f24195d30` |
| `package-lock.json` SHA-256 | `11be6b8e0883892f3e8435ccb72bdac0d2467a860fab5ef43d102b28f50a3596` |
| TEST-STABILITY-001 follow-up files | 2,653 |
| TEST-STABILITY-001 follow-up SHA-256 | `212f3f5c26bbb3764cad8a487e3c834157f68255f4ff662fc898e9a15d3dedb1` |

The working-tree SHA-256 values were computed by sorting all paths returned by `git ls-files --cached --others --exclude-standard`, hashing every existing file with SHA-256, serializing each entry as `<file hash><two spaces><repository-relative path><LF>`, and hashing the resulting UTF-8 manifest. This baseline report is excluded from both fingerprints to avoid a self-referential digest. The follow-up fingerprint includes the TEST-STABILITY-001 change.

The untracked total includes development tooling and agent support files as well as product files. Major groups are `.impeccable` (622), `.agents` (154), `.github` (154), `.claude` (150), `src` (41), `docs` (27), `e2e` (20), `public` (19), `supabase` (5), and `scripts` (2). A future release candidate must select and commit the intended product/configuration files and exclude local tooling artifacts deliberately.

## 2. Validation environment

| Component | Version |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Node.js | v22.22.3 |
| npm | 10.9.8 |
| Java | OpenJDK 21.0.12.1 LTS |
| Vite | 8.1.4 |
| Vitest | 4.1.10 |
| Playwright | 1.61.1 |

## 3. Validation results

| Gate | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint | `npm run lint` | **PASS** | oxlint exited 0 |
| TypeScript | `npx tsc -b` | **PASS** | exited 0 |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | **PASS** | 0 vulnerabilities reported |
| Diff hygiene | `git diff --check` | **PASS WITH WARNING** | no whitespace error; extensive LF-to-CRLF conversion warnings remain |
| Unit/integration | `npm test -- --reporter=dot --maxWorkers=4` | **PASS** | 448/448 files passed; 2,782/2,782 tests passed; duration 649.57 s |
| Recipient-learning stability | Five consecutive single-worker runs of `RecipientLearning.integration.test.tsx` | **PASS** | 5/5 files and 10/10 tests passed |
| Recipient-learning E2E | `npx playwright test e2e/recipient-learning.spec.ts --reporter=line` | **PASS** | Chromium scenario passed 1/1 |
| Production build | `npm run build:release` | **PASS** | 4,656 modules transformed; Vite build and PWA generation completed |
| Bundle budget | `npm run check:bundle` through release build | **PASS** | 200 JS chunks; 3,705.9 KiB total; largest chunk 452.4 KiB |
| Main E2E | `npm run test:e2e` | **PASS** | 121 passed, 1 performance test conditionally skipped; 2.4 min |
| Account/PIN regression | `npx playwright test --config=e2e/auth-entry.config.ts` | **PASS** | 17/17 passed |
| Login accessibility/validation | `npx playwright test --config=e2e/login.config.ts` | **PASS** | 5/5 passed |
| Nexus All layout/accessibility | `npx playwright test --config=e2e/project-hub.config.ts` | **PASS** | 12/12 passed |
| Isolated performance gate | `NEXUS_PERFORMANCE=1` with `release-readiness.spec.ts` mobile-constrained test | **PASS** | 1/1 passed |
| Android debug build | `scripts/build-android.ps1` | **PASS FOR DEBUG** | Gradle build successful; 369 actionable tasks, 24 executed and 345 up-to-date |
| Android APK signature | Android Build Tools 36 `apksigner verify --verbose --print-certs` | **PASS FOR DEBUG** | v2 signature verified; signer `C=US, O=Android, CN=Android Debug` |

## 4. Resolved test-stability blocker

The original full-suite run failed in the second-transaction portion of `src/features/finance/pages/RecipientLearning.integration.test.tsx` because the test assumed the Drawer's exit animation would retain the first form instance and its expanded `More` state. Under full-suite scheduler load, the animation could finish before the drawer reopened, producing a fresh collapsed form where the optional recipient field was absent.

TEST-STABILITY-001 removed that timing assumption. The test now expands `More` only when the recipient field reset during the close/reopen transition. No production behavior or business logic changed. Five consecutive targeted runs, the full four-worker suite, and the equivalent browser E2E scenario all pass.

## 5. Non-blocking observations

- Unit/integration runtime was 649.57 seconds. CI feedback is functional but slow enough to impede release iteration.
- Test output contains repeated `GalleryPermissions` duplicate-registration warnings, jsdom navigation warnings, and router `No routes matched location "/"` warnings. They did not fail the run but reduce signal quality.
- `git diff --check` reports widespread LF-to-CRLF conversion warnings. The release process should normalize line-ending policy before creating the release candidate.
- The Android artifact remains a debug APK. Current file: `android/app/build/outputs/apk/debug/app-debug.apk`, 21,629,806 bytes, SHA-256 `AD9AD66C4D443BCC7434CF70D219E6F3857A4434F4FA335B1B653305AB5B8B29`.

## 6. Checks not represented by this baseline

- No production deployment was created from this dirty working tree.
- Production smoke was not used to validate this snapshot because the currently deployed URL is not proven to contain this exact source fingerprint.
- Supabase production migration parity, database lint, RLS behavior, Dashboard configuration, backup/restore, and remote secrets were not reverified in this run.
- Nexus Tools and DataLens are separate deployables and are outside this repository baseline.
- No Android release AAB, production signing identity, Play Console declaration, device installation, or store review was performed.
- No independent penetration test, legal sign-off, DPO sign-off, operational drill, uptime evidence, or commercial approval is implied.

## 7. Baseline decision

The repository builds and its browser and Android debug paths are substantially healthy. TEST-STABILITY-001 is resolved, but this snapshot is **not a release candidate** because:

1. the source is not committed and contains a very large mixed working tree;
2. the deployed environment is not bound to this source fingerprint; and
3. production Supabase and Android release evidence are outside this validation record.

The next planned task is to create the release blocker registry, with accountable owners, evidence requirements, dependencies, and exit criteria for each P0/P1 item. The mixed working tree must later be partitioned and committed into a reviewable release candidate before any production decision.
