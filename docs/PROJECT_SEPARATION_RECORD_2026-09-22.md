# Project separation record — 2026-09-22

The workspace now has explicit project folders under `D:\Project_001\Nexus-Project` while the original `Nexus` repository remains intact as the source of truth.

| Folder | Status | Source / deployment |
| --- | --- | --- |
| `Nexus` | Original monorepo preserved | `https://github.com/Piecez2548/Nexus` / `https://nexus-lemon-eight-32.vercel.app` |
| `Nexus Main` | Standalone build snapshot created | Main route entry points at `/dashboard`; dedicated remote not created |
| `AlgoViz` | Standalone source extraction created | Dedicated remote/deployment not created |
| `ScreenTutor` | Standalone source extraction created | Dedicated remote/deployment not created |
| `DataLens` | Already independent Git repository | `https://github.com/Piecez2548/DataLens` / `https://datalens-kappa-one.vercel.app` |
| `Nexus Tools` | Placeholder manifest only | Production URL exists; canonical source repository was not found locally |

The extraction is copy-first and non-destructive. Existing routes in the original Nexus app were not changed, and no credentials or environment files were copied. Each extracted application must pass an independent install/build/runtime check before its Project Hub link is switched to a new deployment.
