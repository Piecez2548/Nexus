# Release Manifest — 2026-10-29 (Phase 0.1)

Snapshot of every Nexus repository's local git state compared with GitHub `main` and the latest Vercel Production deployment (read from the GitHub Deployments API, which the Vercel integration writes). Read-only check; nothing was built or deployed.

## Manifest

| System | Repository | Local branch / HEAD | GitHub `main` | Production deploy (SHA · time UTC · state) | Uncommitted | Production URL |
|---|---|---|---|---|---:|---|
| Nexus root (Hub, embedded Main/AlgoViz/ScreenTutor) | `Piecez2548/Nexus` | `main` · `1d8cbd5f6a46` (2026-09-22) | `1d8cbd5f6a46` | `1d8cbd5f6a46` · 2026-09-22 08:47 · success | **203** (26 untracked) | https://nexus-lemon-eight-32.vercel.app |
| Nexus Main | `Piecez2548/Nexus-Main` | `main` · `287fee234261` | `287fee234261` | `287fee234261` · 2026-09-22 08:53 · success | 0 | https://nexus-main-phi.vercel.app |
| Nexus Tools | `Piecez2548/Nexus-Tools` | `main` · `7f2ffb90d384` | `7f2ffb90d384` | `7f2ffb90d384` · 2026-09-22 08:54 · success | 0 | https://nexus-tools-chi.vercel.app |
| DataLens | `Piecez2548/DataLens` | `main` · `72839dc619f7` | `72839dc619f7` | `72839dc619f7` · 2026-09-22 08:51 · success | 0 | https://datalens-kappa-one.vercel.app |
| AlgoViz | `Piecez2548/AlgoViz` | `main` · `edd5bcfb0d8e` | `edd5bcfb0d8e` | `edd5bcfb0d8e` · 2026-09-22 08:52 · success | 0 | https://algoviz-brown-kappa.vercel.app |
| ScreenTutor | `Piecez2548/ScreenTutor` | `main` · `7a9be44d76f3` | `7a9be44d76f3` | `7a9be44d76f3` · 2026-09-22 08:50 · success | 0 | https://screentutor.vercel.app |

Full SHAs: Nexus `1d8cbd5f6a4648b1fad5c43b7e292c65bd59f845`, Nexus-Main `287fee23426102319a235598f35d60312ea128be`, Nexus-Tools `7f2ffb90d3847b34399250883088a37ef49f2ad0`, DataLens `72839dc619f730a80f4d57a6052cb6f0511a1362`, AlgoViz `edd5bcfb0d8e559ac22f64312539e00e5a746510`, ScreenTutor `7a9be44d76f3c668b74273f8e05a7ac83f6db9a1`.

## Conclusions

1. **Production = committed HEAD for all six repositories.** No deployment lags behind git. The gap is between the root working tree and git.
2. **Root `/` showing ScreenTutor is the committed behavior, not a stale deploy.** At `1d8cbd5`, `src/appEntry.ts` `shouldOpenScreenTutor()` returns true on web for `/` and `/index.html`, and `src/App.tsx` renders `ScreenTutorApp` there. The Hub-at-root change (`src/router/router.tsx`, `src/App.tsx`, `src/appEntry.ts`, `index.html`) exists only as uncommitted edits.
3. **Root `/screentutor` requires login in production** because the committed router has no public `/screentutor` route; the uncommitted router adds one outside `MainRoute`.
4. **Nexus Main production is deployed but unusable**: the build has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so the app shows `authUnavailable`. Fix is Vercel env vars + redeploy, not code.
5. **The root working tree mixes out-of-scope work.** Of the 203 uncommitted paths, most are under `xauusd-ai-trader/` (frontend, services, tests, mt5, alembic, …), alongside ~30 under `src/features`. These must be separated before any root release commit.

## Production smoke check (same day)

| URL | Result |
|---|---|
| root `/` | ScreenTutor UI (matches committed HEAD) |
| root `/projects` | Nexus All sign-in |
| root `/dashboard` | redirects to `/projects?returnTo=%2Fdashboard` |
| root `/algoviz` | AlgoViz, public |
| root `/screentutor` | redirects to sign-in |
| Nexus Main | `authUnavailable` error |
| Nexus Tools | 17 tools, no console errors |
| DataLens | sign-in; `/api/health` → `{"status":"ok","version":"0.7.1","authentication_required":true}` |
| AlgoViz | loads, no console errors |
| ScreenTutor | loads; demo-fallback behavior not exercised |

## Next actions

1. Set Nexus Main Supabase env vars in Vercel and redeploy (owner action).
2. Split the root working tree: move `xauusd-ai-trader/` changes out of the Nexus repo (or to their own branch/repo), then commit the Hub/ScreenTutor routing change and the `src/features` work in reviewable commits.
3. Re-run root regression (Phase 0.3 suite), deploy, and repeat this manifest to confirm `/` → Hub and `/screentutor` public.
