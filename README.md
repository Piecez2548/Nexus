# ScreenTutor

> See. Understand. Learn.

ScreenTutor is a local-first Windows screen learning assistant. Select a region, trigger `Ctrl + Shift + Space`, and receive a concise OCR-backed explanation from Ollama running on your own device. Screen data is never uploaded and source websites are never controlled.

The MVP surface is implemented in `src/features/screentutor/`. The repository still contains the original Nexus modules for reference and future reuse; the default application entry now launches ScreenTutor.

## ScreenTutor setup (Windows 11)

```powershell
npm ci
# Install Ollama from https://ollama.com/download/windows, then:
ollama serve
ollama pull qwen2.5:3b
npm run electron:dev
```

The browser preview is also available with `npm run dev`. Ollama is optional for the UI preview; the test-capture action uses a local demo response when no model is connected. Native region capture is available in the Electron desktop wrapper.

## ScreenTutor MVP features

- Region selection with saved coordinates and reset/change controls.
- Thai, English, and Thai + English OCR through a replaceable `OCRService` boundary.
- Lightweight content classification for multiple-choice, programming errors, translation, math, and general text.
- Ollama health/model discovery and structured JSON analysis with prompt-injection boundaries.
- Non-blocking result overlay, OCR debug panel, local searchable history, and settings.
- Keyboard navigation, visible focus states, responsive layout, and local-only persistence.

See [docs/SCREENTUTOR_MVP.md](docs/SCREENTUTOR_MVP.md) for architecture, validation results, limitations, and the next recommended task.

---

# Nexus

> A local-first personal finance and productivity workspace built with React, TypeScript, and Capacitor.

[![CI](https://github.com/Piecez2548/Nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/Piecez2548/Nexus/actions/workflows/ci.yml) [![Live preview](https://img.shields.io/badge/live%20preview-Vercel-black)](https://nexus-lemon-eight-32.vercel.app/)

Nexus brings everyday finance, trading notes, and personal routines into one privacy-conscious application. Data is stored on the device by default. Cloud sync, client-side encryption, biometric unlock, and the Android shell are optional layers built on top of the same local-first data model.

The repository is maintained as a personal/demo product and engineering portfolio. The [production preview](https://nexus-lemon-eight-32.vercel.app/) is authentication-gated; the app can also run locally without cloud credentials.

## What this project demonstrates

- A feature-first architecture with a consistent store → service → repository boundary.
- Offline-first IndexedDB storage with optional end-to-end encrypted multi-device sync.
- Explainable, deterministic financial analytics that run on-device.
- Cross-platform delivery through Vite, Capacitor Android, and Electron.
- Production-minded engineering: accessibility checks, bundle budgets, typed builds, integration tests, and CI release gates.

## Capabilities

| Area | Included workflows |
| --- | --- |
| Finance | Transactions, accounts, categories, budgets, goals, net worth, reports, CSV/PDF export |
| Capture | Thai/English QR and OCR slip scanning, gallery scanning, payment-notification capture |
| Trading | Trade journal, portfolio, strategies, watchlist, risk and performance analytics |
| Productivity | Todos, habits, schedules, reminders, workouts, GPS route tracking |
| Security | Local PIN/biometric lock, optional AES-GCM encryption, recovery, audit log |
| Sync | Optional Supabase authentication, encrypted relay sync, tombstones, conflict handling |

## Architecture

```text
React Router pages
        ↓
Feature components and hooks
        ↓
Zustand stores
        ↓
Domain services
        ↓
Dexie repositories (encryption + sync metadata)
        ↓
IndexedDB — the local source of truth
```

Each domain lives under `src/features/<name>/`. Shared UI and cross-cutting infrastructure live under `src/components`, `src/layouts`, `src/hooks`, `src/i18n`, and `src/platform`. The optional Supabase layer relays encrypted records between a user's own devices; it is not a server-side business-logic layer.

## Technology

- React 19, TypeScript 6, Vite 8, Tailwind CSS 4
- Zustand, React Router, React Hook Form, Zod
- Dexie/IndexedDB, Web Crypto API, Supabase (optional)
- Tesseract.js, jsQR, Recharts, Leaflet
- Capacitor 8 for Android and Electron for desktop
- Vitest, Testing Library, Playwright, and Oxlint

## Run locally

```bash
git clone https://github.com/Piecez2548/Nexus.git
cd Nexus
npm ci
npm run dev
```

The app starts at `http://localhost:5173` and works without a `.env` file. Copy `.env.example` only when you need optional Supabase sync or Sentry monitoring.

## Quality checks

```bash
npm run lint          # Oxlint
npx tsc -b            # TypeScript project check
npm test              # Unit and integration suite
npm run build:release # Production build + bundle budget
npm run test:e2e      # Playwright browser checks
```

CI runs the relevant checks on pushes and pull requests targeting `main`. See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for the test strategy and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for release procedures.

## Repository guide

- [Documentation index](docs/README.md) — architecture, feature modules, security, and evidence records
- [Project architecture](docs/PROJECT_ARCHITECTURE.md) — layering and data flow
- [Security model](docs/SECURITY.md) — authentication, encryption, sync, and known boundaries
- [Roadmap](docs/ROADMAP.md) — shipped work and explicitly deferred scope
- [Contributing](CONTRIBUTING.md) — local workflow and pull request expectations

## Scope and responsible use

Nexus is currently a personal/demo application. Legal, commercial, production-signing, and operational release work is tracked separately in the [release blocker registry](docs/RELEASE_BLOCKER_REGISTRY_2026-09-12.md) and must be completed before a public paid or real-data pilot. Do not use real credentials or personal financial data in tests, issues, or pull requests.

## License

This repository does not currently include an open-source license. Until a license is added, viewing the source does not grant permission to reuse, redistribute, or sell it.
