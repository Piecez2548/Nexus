# RB-020 — Deployment and production smoke evidence (2026-09-13)

This is an engineering smoke record for the currently published web candidates. It does not close RB-020 because release-owner/QA acceptance, candidate approval and the prerequisite RB-010/RB-015/RB-021/RB-022 evidence are still required.

| Product | Source commit | Vercel deployment | Production URL | Smoke |
|---|---|---|---|---|
| Nexus All/Main | `a4186e9` | `dpl_7HhmssgWsbtZmu8C2S9vCaPd2KKV` | `https://nexus-lemon-eight-32.vercel.app` | HTTP 200 for `/` and `/dashboard` |
| Nexus-Tools | `35e9793` | `dpl_73wtdnJ1MuH3ESXeuvFHfFgfamWf` | `https://nexus-tools-chi.vercel.app` | HTTP 200 for `/` and `/projects` |
| DataLens | `5b5db3b` | `dpl_144bEws1Vhbh4dbn6Q2LuWDAeSSC` | `https://datalens-piecez2548s-projects.vercel.app` | HTTP 200 for `/` |

All three smoke checks were executed on 2026-09-13 and returned successfully. This pass did not alter production data or install a mobile build. Authenticated isolation, lock/sign-out, rollback and release-owner sign-off remain separate acceptance checks.
