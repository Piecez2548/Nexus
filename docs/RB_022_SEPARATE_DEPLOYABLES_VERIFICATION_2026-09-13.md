# RB-022 — Separate deployables verification (2026-09-13)

This record captures the engineering evidence prepared for the Tools/DataLens release candidate. It does not constitute legal, security, QA-owner or release-authority acceptance; those appointments remain tracked by the release registry.

## Nexus-Tools

- GitHub `main`: `35e9793` (`feat: secure tools handoff and shared theme`), pushed to `Piecez2548/Nexus-Tools`.
- ESLint: passed.
- Production build: passed.
- Unit tests: 54/54 passed across 11 files.
- Browser regression: 105 passed, 1 expected skip. The skipped test is the CDP-only release-performance scenario excluded from unsupported browser projects; Chromium coverage remains included.
- Production deployment: Vercel `dpl_73wtdnJ1MuH3ESXeuvFHfFgfamWf`, alias `https://nexus-tools-chi.vercel.app`, HTTP 200 smoke passed.

## DataLens

- GitHub `main`: `5b5db3b` (`feat: harden governed analytics flow`), rebased onto remote `f6dcb36` and pushed to `Piecez2548/DataLens`.
- Frontend ESLint: passed.
- Frontend TypeScript/Vite production build: passed.
- Frontend Playwright E2E: 3/3 passed, including governed CSV analysis and 390px mobile overflow/identity checks.
- Backend pytest: 42/42 passed. Two existing dependency deprecation warnings were emitted by Starlette/httpx and anyio.
- Production deployment: Vercel `dpl_144bEws1Vhbh4dbn6Q2LuWDAeSSC`; deployment URL returned HTTP 200. The production alias is `https://datalens-piecez2548s-projects.vercel.app`.

## Release status

RB-022 remains **In Progress** pending the named Tools/DataLens owner, appointed QA reviewer, candidate acceptance record and the wider RB-015 release-governance evidence. No mobile installation was performed in this pass, per the current operating instruction.
