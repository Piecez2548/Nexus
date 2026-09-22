# Project separation record — 2026-09-22

The workspace now has explicit project folders under `D:\Project_001\Nexus-Project` while the original `Nexus` repository remains intact as the source of truth.

| Folder | Status | Source / deployment |
| --- | --- | --- |
| `Nexus` | Original monorepo preserved | `https://github.com/Piecez2548/Nexus` / `https://nexus-lemon-eight-32.vercel.app` |
| `Nexus Main` | Standalone build and Vercel deployment | [GitHub](https://github.com/Piecez2548/Nexus-Main) / [Vercel](https://nexus-main-phi.vercel.app) |
| `AlgoViz` | Standalone build and Vercel deployment | [GitHub](https://github.com/Piecez2548/AlgoViz) / [Vercel](https://algoviz-brown-kappa.vercel.app) |
| `ScreenTutor` | Standalone build and Vercel deployment | [GitHub](https://github.com/Piecez2548/ScreenTutor) / [Vercel](https://screentutor.vercel.app) |
| `DataLens` | Independent GitHub and Vercel project | [GitHub](https://github.com/Piecez2548/DataLens) / [Vercel](https://datalens-kappa-one.vercel.app) |
| `Nexus Tools` | Independent GitHub and Vercel project | [GitHub](https://github.com/Piecez2548/Nexus-Tools) / [Vercel](https://nexus-tools-chi.vercel.app) |

The extraction is copy-first and non-destructive. Existing routes in the original Nexus app were not changed, and no credentials or environment files were copied. Each extracted application passed an independent install/build/runtime check. GitHub and Vercel projects are now connected; Project Hub links can be switched in a separate routing task.

