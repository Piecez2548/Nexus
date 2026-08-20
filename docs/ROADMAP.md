# Roadmap

**Last Updated:** 2026-08-21

## Overview

This roadmap replaces the previous version (last updated 2026-07-21), which was written before Trading, Portfolio, Todo, Habits, Life Schedule, Sync, Encryption, App Lock, and the entire AI Analytics engine existed in their current form — most of what it listed as "not started" is now built. This version is derived directly from the current source tree (see [MODULES.md](MODULES.md), [AI_ANALYTICS.md](AI_ANALYTICS.md)), not from an external blueprint document. Checkboxes are a backlog, not a commitment.

## Completed

### Finance
- [x] Transactions (5 types: income/expense/transfer/refund/adjustment), Accounts, Categories — full CRUD, in-use delete guards, duplicate merge
- [x] Budgets (recurring, per-category, live progress) and Savings Goals (with a 25/50/75/100% milestone-event log)
- [x] Recipient-based Learning Engine (confidence-scored auto-categorization) + seeded Merchant Database fallback
- [x] Merchant Database management UI — full CRUD (previously seed-only/read-only)
- [x] Recipient Profiles page (view/delete, read-only — profiles are server-derived)
- [x] Duplicate transaction/account/category detection and merge
- [x] Thai + English on-device receipt-slip OCR (Tesseract.js) with regex-based parsing
- [x] CSV/PDF/JSON export, CSV import with validation preview
- [x] Quick Add transaction templates, Favorites
- [x] Gallery Slip Scanner: date-range-bounded scanning (pick a from/to date, native MediaStore query scoped to it, live pre-scan count estimate) alongside the existing whole-gallery scan
- [x] Payment Notification Capture — one-tap transaction entry from a recognized banking app's own payment notification (SCB Easy, K PLUS, Krungthai NEXT, เป๋าตัง), with an editable name/category and an income/expense selector
- [x] Net Worth (FIN-002) — manually-tracked assets and liabilities (one unified model with an asset/liability discriminator, mirroring Portfolio's Holding — no live price feed), total assets/liabilities/net worth, and a daily historical trend log started from whenever this feature ships
- [x] Subscription Manager (FIN-004) — independently-managed recurring payments (status, billing frequency, next billing date, category/account, notes), genuinely distinct from the pre-existing duplicate-subscription *detection* logic, which remains a read-only view with no independent lifecycle; a due subscription can automatically log its transaction (foreground-only, deterministic, capped catch-up) and optionally send a reminder notification the day before
- [x] Budget Improvements (FIN-001) — a `BudgetPeriodSnapshot` history log (survives a budget's amount being edited later, unlike the always-live-recomputed current view) and a proactive toast alert the first time a budget genuinely escalates into "near" or "over" limit
- [x] Reports module — a Financial Summary export (monthly income/expense/saving totals + category breakdown, PDF+CSV) and an AI Analytics Report export (Executive Summary + Health Score highlights, PDF), both reusing `useFinancialAnalysis()`'s existing computed data rather than new business logic

### AI Analytics (rule-based, fully local — see [AI_ANALYTICS.md](AI_ANALYTICS.md) and the Sprint 1 P001–P011 audit)
- [x] Weighted, explainable Financial Health Score (7 sub-scores)
- [x] Rule Engine (~46 rules across 15 categories)
- [x] Recommendation Engine (difficulty/timeline/impact-enriched)
- [x] Behavior Analysis Engine (9 detectors, 8 domain analyzers, spending-style classification)
- [x] Forecast & Trend Engine, including an interactive What-If scenario simulator
- [x] Executive Summary Generator
- [x] AI Coach (16-intent keyword-classified Q&A)
- [x] AI Gateway infrastructure (`src/ai/`) — built, tested, **not yet wired into the app**

### Trading & Portfolio
- [x] Trading Journal — full trade CRUD with psychology/session/strategy metadata
- [x] Trading Dashboard — win rate, profit factor, average RR, max drawdown, expectancy, average holding time, equity curve, drawdown chart, R-multiple risk distribution, per-session stats, per-strategy comparison table, performance calendar
- [x] Heuristic (non-AI) market-type detection, CSV export
- [x] Risk Management config — configurable daily/weekly max-loss limits with a breach banner
- [x] Trade Replay — a read-only entry/position/exit/reflection timeline per trade, reusing only fields already recorded on it (no external chart/price data)
- [x] Strategy Library / Playbook — named strategies with entry/exit rules and risk notes, offered as suggestions on the trade form
- [x] Watchlist — tracked symbols with a manual target price (no live price feed)
- [x] Economic Calendar — user-logged trading-relevant events (no external economic-data API), with an upcoming-events Dashboard widget
- [x] Portfolio — manual holdings tracker with cost basis and unrealized P/L

### Productivity
- [x] Todo (priority, due date, filters)
- [x] Habit Tracker (daily/weekly streaks with grace period, native reminders)
- [x] Life Schedule (recurring daily-routine timeline, drag-to-retime, live current-activity tracking) — replaced the earlier Calendar feature
- [x] Workout Tracker — exercise catalog (calorie rates, YouTube demo link), manual entry logging (reps/rounds/duration), a work/rest interval timer with haptic feedback, real GPS route tracking (Leaflet map, live distance/pace), today's-summary + 14-day streak strip

### Vault
- [x] Encrypted password manager, secure notes, and recovery-key store — one unified `VaultEntry` model, gated behind `encryptionEnabled`

### Security & Sync
- [x] Device-local PIN + biometric App Lock, auto-lock timeout
- [x] Supabase email/password authentication (optional, no-op if unconfigured)
- [x] Client-side AES-GCM encryption-at-rest, PBKDF2 key derivation, account-password-based escrow/recovery
- [x] Generic push/pull sync engine, tombstone-based deletion propagation, last-write-wins conflict handling, malformed-row guard, self-healing push-cursor repair (a one-time per-device migration that clears any push cursor left stuck by a since-fixed nudge bug)
- [x] App-wide, persisted Audit Log (auth, encryption, lock, vault, backup events — success/failure, never sensitive content)
- [x] Permission Manager (SEC-001) — a single dedicated view of every OS-level permission the app requests (Gallery, Location, Local Notifications, Notification Access), with Request/Open Settings actions, replacing scattered inline permission checks
- [x] Disable Encryption flow (SEC-005) — the symmetric inverse of `enableEncryption`: decrypts every table and verifies none remain encrypted before clearing the wrapped DEK, so the app can never be left with data permanently unreadable if interrupted partway through

### Platform & cross-cutting
- [x] Full Thai/English i18n (validation messages included, via a `TranslateFn`-factory pattern)
- [x] Dark/light/system/mono themes
- [x] Gamification layer (XP, levels, streaks)
- [x] Global search across every entity type
- [x] Capacitor Android build (APK), Electron desktop shell
- [x] Sentry error monitoring (optional)
- [x] CI pipeline (lint, type-check, unit/integration tests, build, e2e) on every push/PR to `main`

## Recently Shipped (detailed)

- **Gallery Slip Scanner** (`GS` epic — see [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md) and `MASTER_TASK.md`) — a production, plugin-agnostic gallery scanner, **complete (GS 50/50 + PLT 20/20)** and **verified on-device, including a full physical tap-through of the live native flow**. The full pipeline: scan foundation (permission manager, `MediaProvider` orchestration, concurrent queue, versioned cache, GS-005–GS-008); extraction (QR detection, EMVCo/PromptPay parsing, plugin-based bank identification, OCR fallback reusing the existing Tesseract engine, slip-level dedup, GS-009–GS-013); the `SlipCandidate` model, bank-selection popup, Import Preview and Smart Import with batch/progress/resume/rollback (GS-014–GS-016); security/performance/validation/analytics layers (GS-017–GS-020); a refinement wave (GS-023–GS-039) — battery-aware scan scheduler, image hash + perceptual hash, slip validation, QR recovery (rotate/brighten/contrast retries), image enhancement, a per-field OCR engine, a slip classifier, a bank template engine, a graded-probability duplicate engine, an import conflict resolver, a background worker, a scan-progress dashboard, import history, a performance monitor, a recovery system, a security audit layer, dev tools; and the deterministic, advisory AI layers (GS-041–GS-050) — slip verification, fraud detection, transaction categorization with learning, merchant intelligence, a smart learning engine, a confidence engine, transaction linking, spending intelligence, quality review, and a financial intelligence report. The `PLT` platform epic landed alongside it: genuinely-new frameworks (Event Bus, Feature Flags, Command Palette, Local Telemetry, `src/platform/`) plus the rest mapped to existing systems (see [../tasks/Platform/PLATFORM_DESIGN.md](../tasks/Platform/PLATFORM_DESIGN.md)), certified at PLT-020.

  **Post-launch stabilization** — with both epics complete, the native picker was verified on a real Android device against real Thai bank slips, surfacing bugs (wrong amounts, unidentified banks, poor merchant/title extraction, an on-device QR-decode fallback gap) fixed as found, followed by two code-review passes over the whole pipeline (bank identification for real EMVCo banks, category-learning wiring, adaptive OCR preprocessing, dead-code consolidation, several `slipParser.ts` edge cases — and a second pass catching regressions the first pass introduced). See [../tasks/TASK_REGISTRY.md](../tasks/TASK_REGISTRY.md)'s "Post-Launch Stabilization" section and [CHANGELOG.md](CHANGELOG.md).

  **Slip Intelligence, Phases 1-9 (2026-08-15)** — a follow-up architecture review found several engines built and fully tested but never called from production, and two entirely separate scan pipelines that had never been integrated. Nine phases closed these gaps: wired the Confidence Engine, Smart Duplicate Engine, Import Conflict Resolver, and Recovery System into production; added a confidence-tier auto-import policy; a Review Queue UI (`ReviewEditForm`) that lets a person correct a scanned slip's amount/merchant/category, closing the category-learning write-side gap; a real Import History screen; checkpoint-write throttling verified at 10k images; and `GalleryMediaPlugin.java`, a real native Android MediaStore plugin backing full-gallery auto-enumeration. See [CHANGELOG.md](CHANGELOG.md) and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the detailed breakdown.

  **Live wiring + real-device tap-through + date-range scanning (2026-08-15 → 2026-08-17)** — `GalleryMediaPlugin.java`'s pagination was fixed (a `LIMIT`/`OFFSET` SQL string that threw on real devices, only caught by physically running it), `FullGalleryScanPanel`'s orchestrator was connected to the live "Scan Gallery" button, and the whole chain was physically tap-tested end to end on a real device (button → bank popup → live progress dashboard → Import Preview → import) against a real ~2,500-image gallery. A large gallery-scan speed investigation followed (Tesseract worker-pool reuse instead of one worker per image, QR-recovery variant bounding and JPEG re-encoding, an OCR preprocessing round-trip elimination later reverted after a real accuracy regression, per-stage perf instrumentation). Date-range scanning was then added: a from/to date picker in the existing bank-selection popup, a live pre-scan count estimate, and a native `DATE_ADDED`-bounded MediaStore query — deliberately non-resumable and excluded from the normal incremental scan's cursor lifecycle, to avoid a paused date-range run corrupting a later unrelated scan's resume point.

- **Payment Notification Capture** — reads payment-confirmation notifications from four recognized Thai banking apps (SCB Easy, K PLUS, Krungthai NEXT, เป๋าตัง) via a `NotificationListenerService`, extracting only amount and counterparty (no other notification content is read, nothing leaves the device). A confirm sheet shows the detected bank + amount, lets the person edit the name, pick an income/expense type (the type toggle also switches which category chips are offered), and pick a category before the one-tap Confirm writes it through the same Smart Import pipeline every other import path uses. K PLUS was validated end-to-end against a real payment on a real device; Krungthai NEXT's package name was corrected after an initial wrong guess (`com.ktb.next` → `ktbcs.netbank`, `com.ktb.customer.qr` turned out to be เป๋าตัง instead).

- **Vault** — an encrypted password manager, secure notes, and recovery-key store, gated entirely behind `encryptionEnabled` (shows the existing "Enable Encryption" form instead of a list when it's off). One unified `VaultEntry` model rather than three parallel CRUD verticals. Verified on-device: created one entry of each type, confirmed the raw IndexedDB row for each contains only `id`/`syncId`/`updatedAt`/`encryptedContent` — no plaintext title, username, password, or code.

- **Audit Log** — an app-wide, persisted security audit log (auth sign-in/up/out, encryption enabled/re-escrowed, PIN setup/changed/disabled, biometric toggled, failed unlock attempts, vault entry created/updated/deleted — type only, never content — and backup exported/imported/reset), built on a Gallery-Scanner-only audit mechanism that already existed but had never actually been wired to storage or called from outside scanner code. Found and fixed a real pre-existing gap while wiring it: `backupService`'s export/import/reset never included `vaultEntries` at all.

- **Workout Tracker** — an exercise catalog (calorie rate, optional YouTube demo link) and entry log (reps/rounds/duration/distance), a work/rest interval timer with haptic feedback, and real GPS route tracking (foreground-only, Leaflet/OpenStreetMap map, live distance and pace via a Haversine summation over the recorded route). Verified live on-device including a real indoor WiFi-based GPS fix rendering an actual live route on the map.

- **Subscription Manager (FIN-004)** — an independently-managed recurring-payment entity (name/amount/billing frequency/next billing date/status/category/account/note), built alongside — not on top of — the two pre-existing subscription *detectors* (`useSubscriptions.ts`, `behaviorAnalysis.ts`'s `computeSubscriptions()`), which remain unchanged, read-only views derived from transaction history. `nextBillingDate` is stored exactly as entered and only ever rolled forward for *display* via a `date-fns`-based helper, never rewritten in storage by that path.

- **Subscription auto-generated transactions + reminders (follow-up to FIN-004).** A foreground-only due-check (mounted app-wide, runs on launch and on native app resume) creates a dated `Transaction` for each active, account-having subscription that's due or overdue, then advances `nextBillingDate` by one cycle as the explicit, intended side effect of that specific write — genuinely different from the display-only rolling above, which still never mutates storage. Capped at 12 catch-up cycles per subscription; the generated transaction leaves `recurring` unset so it isn't double-counted by the pre-existing detectors. An opt-in reminder (off by default) fires once, a fixed day before the bill is due, extending the shared reminders mechanism with a new one-off schedule type alongside Habit/Schedule's existing daily/weekly repeats.

- **Budget Improvements (FIN-001).** A `BudgetPeriodSnapshot` history log (upserted per budget per period, so a past period's real performance survives the budget's amount being edited later — the live view alone can't tell you that) plus a proactive toast the first time a budget's status genuinely escalates into "near" or "over" its limit. A brand-new snapshot never toasts on its first-ever record, even if already over limit — avoids a flood of toasts the first time this feature runs against pre-existing spending.

- **Permission Manager (SEC-001).** A single dedicated view of every OS-level permission Nexus requests — Gallery/Photos, Location, Local Notifications, and Notification Access — previously each checked/requested inline by its own feature with no central place to review them. Reuses each permission's existing check function rather than reimplementing any of them, normalized onto the Gallery Scanner's own pre-existing 6-value status union. Adds one small new native capability, `AppSettingsPlugin.java`, opening the app's generic system Settings screen — the one in-app recovery path that didn't exist before for a permanently-denied permission (mirrors the existing single-purpose `openAccessSettings()` Notification Access already had).

- **Sync engine — a second hardening round.** The root cause of a real cross-device data mismatch (a transaction present on one device but never reaching the server) was traced to a subtle push-cursor bug: `pullTable()`'s cursor-advance nudge could push a device's own push cursor past a local, not-yet-pushed row, silently excluding it from every future sync pass with no error ever surfaced. Fixed at the source, plus a one-time, per-device self-healing migration that repairs any cursor already left stuck by the old behavior (safe to run unconditionally — re-pushing an already-synced row is a harmless idempotent upsert). Separately, duplicate account/category records left behind when two devices each seed their own defaults before ever syncing — previously only fixed by manually pressing "Merge Duplicates" in Settings — now merge automatically on every sync pass.

- **Merchant Database management (schema v5's table, previously seed-only).** Full CRUD (`merchantService`/`merchantStore`/`MerchantForm`/`MerchantTable`, `/merchants` route) mirroring Category's own entity pattern most closely — deliberately kept local-only/unsynced/unencrypted like the table already was, since it's bundled reference data, not personal content.

- **Reports module.** A `/reports` page offering two report types, reusing `useFinancialAnalysis()`'s already-computed data (this app's existing AI Analytics engine) rather than any new business logic, and the existing `jsPDF`/`downloadFile` export infrastructure (`transactionPdf.ts`'s pattern): a **Financial Summary** (the trailing 6-month `cashFlowAnalysis.monthlyTrend` income/expense/saving table plus `spendingAnalysis.topCategories`' current-month category breakdown, exportable as PDF or CSV) and an **AI Analytics Report** (Executive Summary's headline/highlights and Financial Health Score's grade/top strengths/weaknesses/recommendations, exportable as PDF) — deliberately scoped to these two narrative sections rather than all 13 `AiAnalytics.tsx` renders on screen, to keep the PDF short. No date-range picker exists anywhere in AI Analytics today (`AiAnalytics.tsx` itself analyzes full transaction history unconditionally), so Reports doesn't add one either — same precedent, not a gap.

- **Deeper Trading analytics.** All eight items from this roadmap's former "Deeper Trading analytics" line, scoped and built in one pass: **Expectancy** and **average holding time** stats (mean realized R-multiple over trades with a stop-loss; mean entry-to-exit span, tolerating missing clock times); a full **Strategy Comparison** table (derived, no new entity); a read-only **Trade Replay** timeline reusing only fields already on a Trade (no external chart/price-history data — this app has none); a **Strategy Library / Playbook** and a **Watchlist** (`targetPrice` is a plain manual number, no live price feed — same precedent as Portfolio's Holdings), each a new synced+encrypted entity (schema v25/v26) following Trade's own `createRepository`/`createCrudService` pattern; and an **Economic Calendar** of user-logged events (schema v27, no external economic-data API), with a compact upcoming-events Dashboard widget — the one new entity that also gets a Dashboard preview, since Strategy Library/Watchlist are reference/management pages reached via nav only, matching Merchant's own precedent. (Risk Management config — daily/weekly max-loss limits with a breach banner — had already shipped separately; this roadmap's Planned section had simply gone stale on that point until now.)

## Planned

Items explicitly implied as unfinished by the current architecture, in rough order of how directly the existing code already supports them:

- **AI Gateway integration** — the seam (`AIProvider`, `LocalRuleProvider`) is fully built; wiring a real LLM provider (e.g. Claude) needs a backend proxy first, since an API key cannot safely live in client code. See [SECURITY.md](SECURITY.md), [DECISIONS.md](DECISIONS.md).

## Future

Larger initiatives with no code-level scaffolding yet:

- **Push notifications** (FCM/APNs/Web Push) — the current `reminders/` module is native-local-only (Capacitor local-notifications), not a push infrastructure.
- **Automation** (IF/THEN workflows, scheduled reports/alerts).
- **2FA and login history** — current security is PIN/biometric (device-local) + Supabase email/password (account-level); no second factor or login-history surface exists.
- **iOS build** — only an Android Capacitor project exists (`android/`, 53 tracked files); no `ios/` project directory exists in the repository.
- **A real backend / multi-user architecture** — Supabase is used only as an auth provider + a generic sync relay (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)); there is no server-side business logic, and none is currently planned. See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture."
- **Semantic versioning / tagged releases** — `package.json` is still at `0.0.0`.

## Current Status

This roadmap reflects the repository exactly as of commit `6dde569` (2026-08-18) — regenerate against the code, not this document, if a long time has passed since this date.

## Future Improvements

Consider re-deriving this roadmap automatically (e.g. from route table + module folder presence) rather than by hand, given how quickly it went stale last time (12 days between the previous update and this one, during which most of the "Not started" list was built).
