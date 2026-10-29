# Commit Plan — Nexus root working tree (2026-10-29)

Proposed split of the 204 uncommitted paths in `Piecez2548/Nexus` (base `1d8cbd5`, branch `docs/release-manifest-2026-10-29`). Nothing has been committed. Companion to [RELEASE_MANIFEST_2026-10-29.md](RELEASE_MANIFEST_2026-10-29.md).

## Inventory

| Group | Paths | Status | Belongs to |
|---|---:|---|---|
| A. `xauusd-ai-trader/` | 130 | all deleted (`D`) | XAUUSD project, not Nexus |
| B. `xauusd-pair-detector/` | 1 dir (71 files incl. `.gitkeep`) | untracked (`??`) | XAUUSD project, not Nexus |
| C. `.gitignore` | 1 | modified, adds only `xauusd-pair-detector/*` rules | follows B |
| D. Product entry: Hub at `/`, public `/screentutor` | 8 | modified/deleted | Nexus |
| E. ScreenTutor fail-closed provider | 5 | modified/new | Nexus |
| F. Android slip scanner runtime fix + safe mode | 26 | modified/new | Nexus |
| G. Docs: status, audits, phase reports | 34 (+ this file) | modified/new | Nexus |

Notes from inspection:
- `xauusd-ai-trader/` is **missing from disk**, not edited; it was last changed by `810ca28`/`67b3cfd` (Phase 2.0.3). Its contents appear to live on in `../XAUUSD Bot Recovery Candidate` (has `api`, `alembic`, `frontend`, `services`, `mt5`, `tests`). `../XAUUSD Bot Release` is a git worktree whose parent repo `../XAUUSD Bot` no longer exists, so that folder has no working git.
- `xauusd-pair-detector/.env` is ignored by the existing `.env` rule; no hard-coded keys found in the files that would be added.

## Decision needed first (XAUUSD)

**Option 1 — recommended: remove XAUUSD from the Nexus repo.**
- Commit A as a deletion (`git rm -r xauusd-ai-trader`). History keeps it recoverable from `1d8cbd5`.
- Do **not** add B to Nexus. Move `xauusd-pair-detector/` out to its own folder/repo, and drop the `.gitignore` block (C).
- Before committing A, confirm `XAUUSD Bot Recovery Candidate` is the copy you want to keep; if not, export with `git archive 1d8cbd5 xauusd-ai-trader` first.

**Option 2 — keep XAUUSD in Nexus.** Restore A (`git restore xauusd-ai-trader`), commit B + C together. Not recommended: it mixes a trading bot into the Nexus deploy repo and its Vercel builds.

## Nexus commits (in order)

Each commit should pass `npx tsc -b`, `npm run lint`, and the tests it touches; run the full suite after commit 3.

**1. `feat(entry): serve Nexus All hub at root and make /screentutor public`** — group D
- `src/App.tsx`, `src/App.test.ts`, `src/appEntry.ts` (deleted)
- `src/router/router.tsx`, `src/router/lazyPages.ts`
- `index.html`, `vite.config.ts` (PWA manifest → "Nexus — Personal Workspace")
- `src/features/projects/projectHub.html` (ScreenTutor card → `/screentutor`)

**2. `fix(screentutor): fail closed when no real provider result`** — group E
- `src/features/screentutor/ScreenTutorApp.tsx`, `ScreenTutorApp.test.tsx` (new)
- `src/features/screentutor/services.ts`, `services.test.ts`, `types.ts`

**3. `fix(scanner): Android gallery runtime fix, diagnostics and safe mode`** — group F
- components: `GalleryScanFlow.tsx`/`.test.tsx`, `ImportPreview.tsx`/`.test.tsx`, `ScannerDiagnosticsPanel.tsx` (new)
- media/hooks: `NativeMediaProvider.ts`/`.test.ts`, `useFullGalleryScan.ts`, `useSmartImport.ts`
- import: `extractSlipCandidate.ts`, `smartImportDeps.ts`, `safeSmartImportDeps.ts`/`.test.ts` (new)
- services: `slipExtractionProcessor.ts`/`.test.ts`, `manualGalleryScan.ts`/`.test.ts`, `scannerDiagnostics.ts`/`.test.ts`, `scannerMode.ts`/`.test.ts` (all new except processor)
- store/repo: `scanStore.ts`, `scanStore.test.ts` (new), `scanCandidateRepository.ts`
- `src/i18n/locales/finance.ts` (permission + diagnostics strings), `src/vite-env.d.ts` (`VITE_NEXUS_SCANNER_SAFE_MODE`)

**4. `docs: phase 0 reports, audits and status`** — group G
- modified: `README.md`, `docs/{AI_ANALYTICS,CHANGELOG,DATABASE_SCHEMA,DECISIONS,MODULES,PROJECT_ARCHITECTURE,README,ROADMAP,SCREENTUTOR_MVP,SECURITY,TECHNICAL_DEBT,TESTING_GUIDE}.md`, the four `*_2026-09-13/14.md` scanner docs, `tasks/TASK_REGISTRY.md`
- new: `docs/*_AUDIT_2026-09-30.md` (5), `CLEANUP_PLAN_2026-09-30.md`, `SYSTEM_STATUS_REPORT_2026-09-30.md`, `SLIP_SCANNER_SYSTEM_FIX_2026-09-30.md`, `PHASE_0_*` reports (5), `NEXUS_ALL_SYSTEMS_SUMMARY_2026-10-29.md`, `RELEASE_MANIFEST_2026-10-29.md`, this file
- Docs that describe both D/E and F (CHANGELOG, ROADMAP, TASK_REGISTRY) are kept together here instead of being split by hunk.

**5. `chore: remove xauusd-ai-trader from Nexus`** — group A (Option 1 only)

## After committing

1. Push the branch, open a PR to `main`, and check the Vercel preview: `/` → Hub, `/screentutor` public, `/dashboard` → sign-in.
2. Merge, then re-run the release manifest to confirm production SHA = new `main`.
3. Mirror commit 2 into `Piecez2548/ScreenTutor` (standalone drift, summary §9.3).
