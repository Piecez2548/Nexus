# Architecture Decision Records

**Last Updated:** 2026-08-02

## Overview

This document explains the major technical decisions visible in the codebase and, where the code itself documents its own reasoning (a comment explaining "why," not just "what"), that reasoning is quoted or closely paraphrased rather than guessed at. Decisions without an explicit in-code rationale are marked as inferred from the resulting architecture.

## Why React?

React 19 + TypeScript + Vite was the starting stack from the project's initial commit — no migration or framework evaluation is visible in the git history. The choice enables the rest of the stack (React Router, React Hook Form, Recharts, Zustand all assume React) and Capacitor's WebView-wrapping approach for the Android build, which works with any web framework but is a common pairing with React/Vite specifically.

## Why Dexie (IndexedDB)?

**Local-first is the foundational decision the whole app is built around** (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)) — IndexedDB is the only storage that lets a browser-based app work fully offline with real query/index capability (unlike `localStorage`, which is string-only and has no indexing). Dexie is a thin, well-typed wrapper around the native IndexedDB API rather than a full ORM, which keeps the repository layer (`createRepository`) thin enough to also wrap encryption and sync metadata transparently — a heavier ORM would have made that wrapping harder to reason about.

## Why Zustand?

No Redux, no MobX, no Context-based state anywhere in the app. Zustand's minimal boilerplate (`create<State>((set) => ({...}))`, no providers/reducers/action-types) matches the codebase's broader preference for small, direct implementations over ceremony (see [CODING_STANDARDS.md](CODING_STANDARDS.md)'s "comments explain why" rule and the repository/service factories' "generic for the common case" philosophy). Zustand's `persist` middleware also directly supports the small number of stores that genuinely need `localStorage`/`sessionStorage` persistence (preferences, app lock, gamification) without pulling in a separate persistence library.

## Why Offline-first?

This is the app's core identity, not an incidental choice: **every feature works with zero configuration and zero network calls**, and cloud sync/encryption/error-monitoring are all opt-in layers that detect their own absence and no-op cleanly (`isSyncConfigured`, `VITE_SENTRY_DSN` presence — see [SECURITY.md](SECURITY.md)). The generic `synced_records` Supabase table (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)) reinforces this: the client always reads/writes local Dexie first, and the server exists purely to relay changes between a user's own devices — never queried directly for display. This lets the app be genuinely useful to a user who never signs up for anything, which a backend-first design couldn't offer.

## Why a generic `synced_records` table instead of typed Postgres tables per entity?

Inferred from the schema itself (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)): one JSONB-payload table keyed by `(id, table_name)` means adding a new locally-synced entity (as happened 5 times — habits, holdings, calendarEvents, scheduleItems, goalMilestoneEvents, each a one-line additive Dexie migration) requires **zero** Postgres schema changes or migrations, just adding the table name to the client's `SyncTableName` union. The tradeoff, made deliberately and acceptably given the local-first design, is that Postgres itself can never be queried for anything beyond relay/backup — there is no server-side reporting or business logic possible against this schema, which is fine because none is planned (see "Why no backend" below).

## Why client-side, opt-in encryption-at-rest?

Documented directly in code (`src/features/encryption/`, see [SECURITY.md](SECURITY.md)): the DEK (Data Encryption Key) never leaves the device unencrypted, and the server-side escrow only ever holds an AES-GCM-wrapped copy. This means Supabase — a third party — never has access to the plaintext DEK even if its database were fully compromised. The PBKDF2 iteration count (600,000) is explicitly cited in-code as "OWASP's current minimum... 2023 guidance," showing the choice was made against a named external standard, not an arbitrary number.

## Why a deliberately weaker PIN hash than the DEK's key derivation?

`pinHash.ts`'s own comment is explicit: the App Lock PIN is "a local-only privacy gate (no server, no real authentication)... proportionate against 'someone glancing at the screen' or a shared/borrowed device, not against offline brute-forcing of localStorage contents." A single unsalted-per-installation SHA-256(salt:pin) is intentionally cheap because it protects a different, lower-stakes threat model than the DEK's PBKDF2-600k derivation, which protects actual encrypted financial data. Using PBKDF2 everywhere would have made every app unlock noticeably slower for no real security benefit against the PIN's actual threat model. See [SECURITY.md](SECURITY.md) for the full threat-model breakdown.

## Why repository/service factories with named, hand-written exceptions?

`createRepository.ts`/`createCrudService.ts` (see [API_INTERFACES.md](API_INTERFACES.md)) cover the ~12/~9 repositories and services with an identical shape, and each factory file's own comment names exactly which repositories/services are excluded and why (`merchantRepository` — read-only; `goalMilestoneEventRepository` — no update, extra method; `accountService`/`categoryService`/`recipientProfileService` — real merge/guard/learning logic). This is a deliberate middle ground: full generic abstraction (forcing every repository into one shape) would have made the genuinely-different ones awkward or unsafe; no abstraction at all would have meant ~20 files of near-identical boilerplate. Documenting the exceptions by name in the factory's own header, rather than leaving readers to discover them, was itself a decision worth naming.

## Why is Rule-based, not LLM-based, "AI"?

Every "AI" surface in the product (AI Analytics's scoring/recommendations/behavior/forecast/executive-summary, the AI Coach, market-type detection, the daily summary) is deterministic local computation — confirmed by direct reading of every sub-engine (see [AI_ANALYTICS.md](AI_ANALYTICS.md)). Several files state this explicitly as a feature, not a limitation: the AI Coach "never fabricates: if the data can't support a claim, the response says so," and the Recommendation Engine reuses rule text "unchanged... zero new i18n content invented." This buys three things a real LLM integration couldn't as easily guarantee: (1) fully offline operation, matching the local-first decision above; (2) zero cost per user interaction; (3) every number and claim is directly traceable to a specific calculation over the user's own real data, with no hallucination risk — important for a personal-finance app where a wrong number has real consequences.

## Why build the AI Gateway (`src/ai/`) if it's not wired in?

The Gateway (`AIProvider`/`AIGateway`/`ProviderRegistry`/`ProviderFactory`, see [API_INTERFACES.md](API_INTERFACES.md)) was built as a **designed seam**, not abandoned mid-build — confirmed by its own commit message: "a provider-agnostic abstraction so a future remote provider (Claude/OpenAI/Gemini/Ollama) can be swapped in through configuration alone... `LocalRuleProvider`... the first real caller of the Promise-based 'future AI provider' seam each engine already exposed." Every engine's `analyze()`/`ask()`-style method already returns a `Promise` despite being synchronous today, specifically so a real remote provider could be substituted later without changing any calling code. It was deliberately left unconnected because doing so safely requires a backend proxy (an API key cannot live in client code) that doesn't exist yet — see [SECURITY.md](SECURITY.md) and the Sprint 1 P011 audit finding.

## Why Modular (Feature-First) Architecture?

Every domain lives in `src/features/<name>/` with an identical internal shape (`components/`, `pages/`, `hooks/`, `store/`, `services/`, `repositories/`, `types/`, `schemas/`, `utils/` — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)). This is what keeps the dependency graph nearly flat — most modules depend on nothing else (see [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md), confirmed zero circular dependencies across 816 files) — and is what let features like Habit Tracker, Portfolio, and Life Schedule each be added as one self-contained commit without touching unrelated modules. The one deliberately-kept exception to "modules are independent," `src/features/calendar/`'s orphaned `types/index.ts`, exists specifically so a module *removal* doesn't destroy user data — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

## Why Thai-first localization (`th` as the default language)?

Inferred from multiple converging signals: `languageStore.ts` defaults to `"th"`, `appSettingsStore.ts` defaults `currency` to `"THB"`, and `seed.ts`'s merchant list is entirely Thailand-specific brands (7-Eleven, MK, BTS, PromptPay-adjacent references). This is a Thailand-market-first product decision, with English as the fully-supported second language (not an afterthought — see [CODING_STANDARDS.md](CODING_STANDARDS.md)'s `TranslateFn`-factory validation pattern, which treats both languages as first-class from the schema layer up).

## Why no backend / no multi-user architecture?

Not built and, as of this writing, not planned (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture"). This follows directly from the local-first decision: a single-user, per-device app with optional relay-only sync has no structural need for a server that owns business logic. If ever needed, the service layer (`features/<name>/services/*.ts`) is the pre-identified seam a real API-backed implementation would replace, without requiring changes to any store, hook, or page.

## Current Status

All decisions above reflect the codebase as it exists today; none are aspirational.

## Future Improvements

If server-side features are ever required (multi-user, real-time collaboration, LLM-backed AI), the two seams already designed for exactly that (`AIProvider` for AI, the service layer for a general backend) are the intended extension points — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md).
