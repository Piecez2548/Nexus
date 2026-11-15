# Consolidation Plan — Nexus and Nexus Main (2026-11-14)

**Status:** Proposed. Nothing below is implemented; it needs the owner's decision first.

## Problem

Nexus (hub, `com.nexus.app`) and Nexus Main (finance, `com.nexus.finance`) are two full copies of the same application, maintained separately. On 2026-11-13–14 every slip-scanner fix had to be made, tested and reviewed twice, and the CHANGELOGs conflicted on almost every merge.

Measured on 2026-11-14 (`src`, Android Java, `supabase/migrations`, `scripts`, `e2e`):

| | Files |
|---|---|
| Identical in both | 1,240 |
| Present in both but different | 94 (about 2,500 changed lines) |
| Only in Nexus Main | 40 |
| Only in Nexus | 24 |

Where they differ:

- **Hub-only by nature** (about 900 of the changed lines): login screen and its CSS, Project Hub, account boot, `/` routing.
- **Real drift in shared features:**
  - Nexus Main only: account balances (`accountBalance.ts`), upcoming-bill warning (`upcomingCashFlow.ts`, `UpcomingBillsWarning`), backup reminder, own-account transfer detection (`ownTransfer.ts`), AlgoViz and ScreenTutor.
  - Nexus only: scanner diagnostics, `manualGalleryScan.ts`, `scannerMode.ts`, safe smart-import dependencies, login progress, stale-chunk reload.
  - `GalleryScanFlow.tsx` and `NativeMediaProvider.ts` already differ in structure.
- **CI:** only Nexus runs lint, typecheck, tests and build on pull requests; Nexus Main has Vercel checks only.

## Recommendation: one repository, two build targets

Keep **Nexus** as the single source repository and build both apps from it.

- One `src/` tree. A build-time target `VITE_APP_TARGET=hub|finance` switches only what really differs: the `/` route (hub vs `/dashboard`), the hub-only pages and the app name.
- Android: one `android/` project with two Gradle product flavors, `hub` (`com.nexus.app`, "Nexus") and `finance` (`com.nexus.finance`, "Nexus Finance"). `scripts/build-android.ps1 -Target hub|finance`.
- Web: the existing Vercel project for Nexus Main is pointed at the Nexus repository with `VITE_APP_TARGET=finance`; its URL stays the same.
- Nexus Main is archived (read-only) once a finance build from Nexus is verified on the phone.

Why Nexus rather than Nexus Main: it already contains everything the finance app shows (Main lives under `/dashboard`), it has the CI workflow, and the hub-only parts are the ones that would otherwise need to be added to the other side.

Alternatives considered:

- **npm-workspaces monorepo** (`packages/core`, `apps/hub`, `apps/finance`): cleaner boundaries but moves almost every file and every import path; much more churn for the same result.
- **Shared package or git submodule** for the finance code: still two repos, two CIs and version bumps for every fix.

## Steps

1. **Freeze.** Merge open work in both repos and tag both (`pre-consolidation-2026-11`).
2. **Bring Nexus Main's finance features into Nexus**: account balances, upcoming-bill warning, backup reminder, own-account transfer detection. Reconcile the differing shared files (keep the newer behaviour; the scanner follows Nexus's service split). Decide whether AlgoViz and ScreenTutor stay (Nexus currently redirects AlgoViz to its own app).
3. **Add the build target**: `VITE_APP_TARGET`, the router switch (finance: `/` → `/dashboard`), Android product flavors, the build script parameter, and CI building both targets.
4. **Verify**: both APKs on the phone (login, Dashboard, gallery scan, sync), both web builds.
5. **Switch deployments**: point the Nexus Main Vercel project at the Nexus repo with the finance target (owner action in the Vercel dashboard).
6. **Archive Nexus Main** with a README pointing to Nexus.

Rough effort: step 2 one to two sessions, step 3 one session, steps 4–6 short but need the phone and the owner.

## Risks

- Hidden behavioural differences in the 94 differing files: each one is reviewed, and the full test suites of both repos run against the merged code.
- Android signing/app identity: product flavors keep both application ids, so existing installs update in place.
- Users of the Nexus Main web URL: unchanged, because only the Vercel project's source changes.

## Decisions needed from the owner

1. Nexus as the single repository (recommended), or Nexus Main?
2. Keep AlgoViz and ScreenTutor in the finance target, or drop them?
3. Approval to archive Nexus Main after step 4.
