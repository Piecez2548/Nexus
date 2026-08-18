# Project Tree

**Last Updated:** 2026-08-18

## Overview

Complete folder tree of the Nexus repository, generated from `git ls-files` (i.e. every version-controlled file — automatically excludes `node_modules`, `dist`, `coverage`, `.vscode`, and `.git` since none of those are tracked).

**Also excluded from the listing below** (present in the repo but not shown — see note): `android/` and `ios/` — the Capacitor-generated native project wrappers. These are almost entirely framework-generated boilerplate (Gradle files, Android resource XML, Java glue code, launcher icons at 5 densities) with only `android/app/src/main/AndroidManifest.xml` and `android/app/src/main/java/com/nexus/app/MainActivity.java` as meaningfully hand-relevant files; including their ~40 generated files here would bury the application structure that matters. See [DEPLOYMENT.md](DEPLOYMENT.md) for how the Android build is produced from this project.

## Detailed Tree

```
├── docs/
│   └── ROADMAP.md
├── e2e/
│   ├── accounts.spec.ts
│   ├── ai-analytics.spec.ts
│   ├── app-lock.spec.ts
│   ├── budget-and-goals.spec.ts
│   ├── categories.spec.ts
│   ├── dashboard-period.spec.ts
│   ├── habits.spec.ts
│   ├── header.spec.ts
│   ├── life-schedule.spec.ts
│   ├── merge-duplicate-transactions.spec.ts
│   ├── mobile.spec.ts
│   ├── navigation.spec.ts
│   ├── portfolio.spec.ts
│   ├── quick-add.spec.ts
│   ├── recipient-learning.spec.ts
│   ├── storageState.json
│   ├── todo.spec.ts
│   ├── trading.spec.ts
│   └── transactions.spec.ts
├── electron/
│   ├── main.cjs
│   ├── preload.cjs
│   └── staticServer.cjs
├── .github/
│   └── workflows/
│       └── ci.yml
├── patches/
│   └── @capgo+capacitor-native-biometric+8.6.2.patch
├── public/
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── ai/                          # AI Gateway — designed, NOT wired into the app (see AI_ANALYTICS.md)
│   │   ├── config/
│   │   │   ├── aiGatewayConfig.test.ts
│   │   │   └── aiGatewayConfig.ts
│   │   ├── gateway/
│   │   │   ├── AIGateway.test.ts
│   │   │   ├── AIGateway.ts
│   │   │   ├── ProviderRegistry.test.ts
│   │   │   └── ProviderRegistry.ts
│   │   ├── interfaces/
│   │   │   └── AIProvider.ts
│   │   ├── models/
│   │   │   ├── AIContext.ts
│   │   │   ├── AIRequest.ts
│   │   │   ├── AIResponse.ts
│   │   │   └── ProviderConfiguration.ts
│   │   ├── providers/
│   │   │   ├── LocalRuleProvider.test.ts
│   │   │   ├── LocalRuleProvider.ts
│   │   │   ├── ProviderFactory.test.ts
│   │   │   └── ProviderFactory.ts
│   │   ├── services/
│   │   │   ├── aiGatewayService.test.ts
│   │   │   └── aiGatewayService.ts
│   │   ├── utils/
│   │   │   ├── errors.test.ts
│   │   │   └── errors.ts
│   │   └── index.ts
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/                  # Shared UI — see COMPONENT_LIBRARY.md
│   │   ├── importExport/
│   │   │   ├── ExportTransactionsPanel.tsx
│   │   │   └── ImportTransactionsPanel.tsx
│   │   ├── settings/
│   │   │   ├── DangerZoneSettings.tsx
│   │   │   ├── DataSettings.test.tsx
│   │   │   ├── DataSettings.tsx
│   │   │   ├── EncryptionSettings.test.tsx
│   │   │   ├── EncryptionSettings.tsx
│   │   │   ├── LanguageSettings.test.tsx
│   │   │   ├── LanguageSettings.tsx
│   │   │   ├── PreferenceSettings.tsx
│   │   │   ├── SecuritySettings.test.tsx
│   │   │   ├── SecuritySettings.tsx
│   │   │   ├── SettingsCard.tsx
│   │   │   ├── SettingsGroup.tsx
│   │   │   ├── SyncSettings.test.tsx
│   │   │   ├── SyncSettings.tsx
│   │   │   ├── ThemeSettings.test.tsx
│   │   │   ├── ThemeSettings.tsx
│   │   │   └── TransactionDataSettings.tsx
│   │   └── ui/
│   │       ├── AuthBackdrop.tsx
│   │       ├── ChangeBadge.tsx
│   │       ├── ChartCard.tsx
│   │       ├── ChartLegend.tsx
│   │       ├── CircularScoreGauge.test.tsx
│   │       ├── CircularScoreGauge.tsx
│   │       ├── Drawer.test.tsx
│   │       ├── Drawer.tsx
│   │       ├── DropdownPanel.test.tsx
│   │       ├── DropdownPanel.tsx
│   │       ├── ErrorBoundary.test.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── ErrorState.tsx
│   │       ├── FileField.tsx        # dead code — 0 importers, see TECHNICAL_DEBT.md
│   │       ├── FormField.tsx
│   │       ├── IconBadge.tsx
│   │       ├── InfoTooltip.tsx
│   │       ├── LoadingState.tsx
│   │       ├── MobileRowCard.tsx
│   │       ├── MultiFileField.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── SummaryCard.tsx
│   │       ├── TagsInput.tsx
│   │       ├── ThemeToggleSwitch.test.tsx
│   │       ├── ThemeToggleSwitch.tsx
│   │       ├── ToastContainer.test.tsx
│   │       └── ToastContainer.tsx
│   ├── database/                    # Dexie instance + encryption/repository/service factories — see DATABASE_SCHEMA.md
│   │   ├── backupService.test.ts
│   │   ├── backupService.ts
│   │   ├── createCrudService.ts
│   │   ├── createRepository.ts
│   │   ├── db.test.ts
│   │   ├── db.ts
│   │   ├── encryptedRepository.test.ts
│   │   ├── encryptedRepository.ts
│   │   └── seed.ts
│   ├── features/                    # One folder per domain module — see MODULES.md
│   │   ├── calendar/                # ORPHANED — retired in favor of schedule/, kept only for data safety
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── charts/
│   │   │   │   │   ├── CashFlowLineChart.tsx
│   │   │   │   │   └── ExpensePieChart.tsx
│   │   │   │   ├── AiDailySummaryPanel.tsx
│   │   │   │   ├── BudgetPreviewPanel.tsx
│   │   │   │   ├── CashFlowSection.tsx
│   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   ├── DashboardPeriodSelector.tsx
│   │   │   │   ├── HabitPreviewPanel.tsx
│   │   │   │   ├── PortfolioOverviewPanel.tsx
│   │   │   │   ├── RecentTransactionsList.tsx
│   │   │   │   ├── SchedulePreviewPanel.tsx
│   │   │   │   ├── SummaryCardsGrid.tsx
│   │   │   │   ├── TodoPreviewPanel.tsx
│   │   │   │   └── TradingOverviewPanel.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChartData.test.ts
│   │   │   │   ├── useChartData.ts
│   │   │   │   ├── useDashboard.test.ts
│   │   │   │   ├── useDashboard.ts
│   │   │   │   ├── useExpenseByCategory.test.ts
│   │   │   │   └── useExpenseByCategory.ts
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.integration.test.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── store/
│   │   │   │   └── dashboardPeriodStore.ts
│   │   │   └── utils/
│   │   │       ├── dailySummary.test.ts
│   │   │       ├── dailySummary.ts
│   │   │       ├── dashboardPeriodRange.test.ts
│   │   │       └── dashboardPeriodRange.ts
│   │   ├── encryption/              # see DATABASE_SCHEMA.md, SECURITY.md
│   │   │   ├── components/
│   │   │   │   ├── EnableEncryptionForm.test.tsx
│   │   │   │   ├── EnableEncryptionForm.tsx
│   │   │   │   ├── EncryptionRecoveryFlow.test.tsx
│   │   │   │   ├── EncryptionRecoveryFlow.tsx
│   │   │   │   ├── ReescrowDekForm.test.tsx
│   │   │   │   └── ReescrowDekForm.tsx
│   │   │   ├── crypto/
│   │   │   │   ├── encryption.test.ts
│   │   │   │   └── encryption.ts
│   │   │   ├── migration/
│   │   │   │   ├── enableEncryption.test.ts
│   │   │   │   ├── enableEncryption.ts
│   │   │   │   ├── reescrowDek.test.ts
│   │   │   │   └── reescrowDek.ts
│   │   │   ├── recovery/
│   │   │   │   ├── recoverDekFromEscrow.test.ts
│   │   │   │   └── recoverDekFromEscrow.ts
│   │   │   ├── store/
│   │   │   │   └── encryptionSessionStore.ts
│   │   │   ├── catchUp.test.ts
│   │   │   └── catchUp.ts
│   │   ├── finance/                 # core money-tracking module — see MODULES.md
│   │   │   ├── aiAnalytics/         # see AI_ANALYTICS.md (~250 files, summarized there in depth)
│   │   │   │   ├── components/      # aiCoach/, behaviorAnalysis/, behaviorProfile/, categoryDetail/,
│   │   │   │   │   │                #   executiveSummary/, financialHealthScore/, forecast/,
│   │   │   │   │   │                #   merchantAnalysis/, spendingAnalysis/ + 7 top-level sections
│   │   │   │   ├── constants/
│   │   │   │   ├── engine/          # analyzers/, behavior/, coach/, executiveSummary/, forecast/,
│   │   │   │   │   │                #   recommendation/, rules/ (~46 rule files), scoring/, shared/
│   │   │   │   ├── hooks/
│   │   │   │   ├── models/
│   │   │   │   ├── pages/
│   │   │   │   └── types.ts
│   │   │   ├── components/
│   │   │   ├── constants/
│   │   │   ├── hooks/
│   │   │   ├── notificationCapture/ # Payment Notification Capture (Phase 1: SCB, K PLUS, Krungthai NEXT, เป๋าตัง) — see SECURITY.md, MODULES.md
│   │   │   │   ├── components/
│   │   │   │   │   └── PendingPaymentSheet.tsx
│   │   │   │   ├── engine/
│   │   │   │   │   ├── bankPackageRegistry.test.ts
│   │   │   │   │   ├── bankPackageRegistry.ts
│   │   │   │   │   ├── notificationTextParser.test.ts
│   │   │   │   │   └── notificationTextParser.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── usePendingNotificationCandidates.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── buildNotificationCandidate.test.ts
│   │   │   │   │   └── buildNotificationCandidate.ts
│   │   │   │   ├── native/
│   │   │   │   │   └── notificationCapturePlugin.ts
│   │   │   │   └── store/
│   │   │   │       ├── pendingNotificationCandidateStore.test.ts
│   │   │   │       └── pendingNotificationCandidateStore.ts
│   │   │   ├── pages/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── habits/
│   │   ├── lock/                    # app-lock (PIN + biometric) — see SECURITY.md
│   │   ├── portfolio/
│   │   ├── reminders/                # shared native-notification infra (habits + schedule only)
│   │   ├── schedule/                 # "Life Schedule" — replaced calendar/
│   │   ├── security/                 # app-wide, persisted Audit Log (SEC-002) — see SECURITY.md, MODULES.md
│   │   │   ├── components/
│   │   │   │   ├── AuditLogDrawer.test.tsx
│   │   │   │   └── AuditLogDrawer.tsx
│   │   │   ├── auditLog.test.ts
│   │   │   ├── auditLog.ts
│   │   │   ├── auditLogRepository.test.ts
│   │   │   ├── auditLogRepository.ts
│   │   │   ├── dexieAuditSink.test.ts
│   │   │   ├── dexieAuditSink.ts
│   │   │   ├── securityAuditView.test.ts
│   │   │   ├── securityAuditView.ts
│   │   │   └── useAuditLog.ts
│   │   ├── sync/                     # see DATABASE_SCHEMA.md, SECURITY.md
│   │   ├── todo/
│   │   ├── trading/
│   │   ├── vault/                    # passwords, secure notes, recovery keys; always-encrypted (VAULT-001..004) — see SECURITY.md, MODULES.md
│   │   └── workouts/                 # Workout Tracker — exercise catalog, interval timer, GPS route tracking — see SECURITY.md, MODULES.md
│   │       ├── components/
│   │       ├── constants/
│   │       ├── gps/
│   │       ├── pages/
│   │       ├── repositories/
│   │       ├── schemas/
│   │       ├── services/
│   │       ├── store/
│   │       ├── timer/
│   │       ├── types/
│   │       └── utils/
│   ├── hooks/                        # cross-cutting hooks
│   │   ├── useClickOutside.ts
│   │   ├── useGlobalSearch.test.ts
│   │   ├── useGlobalSearch.ts
│   │   ├── useNotifications.test.ts
│   │   ├── useNotifications.ts
│   │   ├── useResolvedTheme.ts
│   │   └── useToast.ts
│   ├── i18n/
│   │   ├── translations.ts
│   │   ├── useTranslation.test.ts
│   │   └── useTranslation.ts
│   ├── layouts/                      # app shell — see ROUTING.md, STATE_MANAGEMENT.md
│   │   ├── GlobalSearch.tsx
│   │   ├── LevelBadge.tsx
│   │   ├── MainLayout.tsx
│   │   ├── MobileMoreMenu.test.tsx
│   │   ├── MobileMoreMenu.tsx
│   │   ├── MobileTabBar.test.tsx
│   │   ├── MobileTabBar.tsx
│   │   ├── navItems.ts
│   │   ├── NotificationsMenu.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.test.tsx
│   │   ├── TopBar.tsx
│   │   └── UserMenu.tsx
│   ├── lib/
│   │   ├── sentry.ts
│   │   └── supabaseClient.ts
│   ├── pages/
│   │   ├── NotFound.tsx
│   │   ├── Settings.integration.test.tsx
│   │   └── Settings.tsx
│   ├── providers/
│   │   ├── ThemeEffect.test.tsx
│   │   └── ThemeEffect.tsx
│   ├── router/                       # see ROUTING.md
│   │   ├── lazyPages.ts
│   │   └── router.tsx
│   ├── store/                        # global (non-per-entity) Zustand stores — see STATE_MANAGEMENT.md
│   │   ├── appLockStore.test.ts
│   │   ├── appLockStore.ts
│   │   ├── appSettingsStore.ts
│   │   ├── gamificationStore.test.ts
│   │   ├── gamificationStore.ts
│   │   ├── languageStore.test.ts
│   │   ├── languageStore.ts
│   │   ├── notificationStore.test.ts
│   │   ├── notificationStore.ts
│   │   ├── toastStore.test.ts
│   │   └── toastStore.ts
│   ├── styles/
│   │   └── index.css
│   ├── tests/
│   │   └── setup.ts
│   ├── utils/
│   │   ├── asyncState.test.ts
│   │   ├── asyncState.ts
│   │   ├── csv.ts
│   │   ├── download.test.ts
│   │   ├── download.ts
│   │   ├── leveling.test.ts
│   │   ├── leveling.ts
│   │   ├── localDate.test.ts
│   │   ├── localDate.ts
│   │   ├── numberField.test.ts
│   │   ├── numberField.ts
│   │   ├── selectField.test.ts
│   │   ├── selectField.ts
│   │   ├── syncMeta.test.ts
│   │   ├── syncMeta.ts
│   │   ├── theme.ts
│   │   └── xpRewards.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/
│   └── schema.sql
├── capacitor.config.ts
├── .env.example
├── .gitignore
├── index.html
├── .oxlintrc.json
├── package.json
├── package-lock.json
├── playwright.config.ts
├── README.md                          # still the default Vite template — see TECHNICAL_DEBT.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── UI_DESIGN_SYSTEM.md
└── vite.config.ts
```

**Note on the `finance/`, `habits/`, `lock/`, `portfolio/`, `reminders/`, `schedule/`, `sync/`, `todo/`, `trading/`, `vault/` subtrees above:** several were collapsed one level for readability where their internal shape is identical to every other feature module (`components/`, `pages/`, `hooks/`, `store/`, `services/`, `repositories/`, `types/`, `schemas/`, `utils/` — see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the shape and [MODULES.md](MODULES.md) for each module's actual file contents). `vault/` (added 2026-08-17) follows this same standard shape, so it's collapsed the same way. The `aiAnalytics/` subtree (~250 files) is summarized rather than fully expanded here since [AI_ANALYTICS.md](AI_ANALYTICS.md) documents its exact structure in full depth. `finance/notificationCapture/`, `security/`, and `workouts/` (all added 2026-08-16/17) are shown expanded instead, since none of the three matches the standard shape exactly (`security/` keeps most files flat at its root rather than sorting them into `services/`/`repositories/`/etc.; `workouts/` adds `gps/` and `timer/` subfolders that don't exist in any other module; `notificationCapture/` adds `engine/` and `native/`).

## Current Status

This tree reflects the repository exactly as of the date above (generated from `git ls-files`, not hand-maintained) — regenerate by re-running the same command if the structure changes materially. Note: `src/features/finance/slipScanner/` (201 tracked files, added 2026-08-07) is **not yet represented** in the tree above — it predates this pass but was out of scope for it; see Future Improvements.

## Future Improvements

Delete `src/features/calendar/` once a decision is made that no user's `calendarEvents` data still needs preserving (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)), which would also let `db.ts` drop the `calendarEvents` table declaration entirely.

Add `src/features/finance/slipScanner/` (201 tracked files — Gallery Scanner / QR+OCR slip import) to this tree. It predates this update pass (earliest commit 2026-08-07, before the doc's prior 2026-08-02 baseline) and was never added when this file was last regenerated; it's sizable enough (comparable to `aiAnalytics/`) to warrant the same summarized-rather-than-fully-expanded treatment, likely cross-referencing whatever document already covers it in depth (check [MODULES.md](MODULES.md) / [SECURITY.md](SECURITY.md) first).
