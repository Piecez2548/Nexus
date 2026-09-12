# Nexus Main / Nexus All theme audit

Date: 2026-08-31. Scope: shared Main shell, navigation, theme switch, and Trading header. The user explicitly requested implementation alongside `$audit`; this report records the audit and the scoped fixes, not an application-wide WCAG certification.

## Implementation integrity verdict

Pass for the scoped alignment: Main now shares All's Manrope/Noto Sans Thai typography, black-green canvas and emerald action identity while retaining its operational dashboard structure. Business logic, navigation destinations, semantic gain/loss colors, authentication, and saved theme selection are unchanged. The bundled detector returned `[]` before and after; manual source checks still found the issues below, so detector silence is not treated as proof of accessibility.

## Audit health score

Final re-audit: **20/20 (Excellent), within the scope defined above**. The first alignment pass scored 15/20; deeper testing found and corrected the additional findings below. Scores are reviewer assessments (0–4), not Lighthouse scores, an application-wide accessibility certification, or a guarantee of zero defects. The scope was not narrowed to exclude a failed test.

| Dimension | Before | After | Evidence / limit |
|---|---:|---:|---|
| Accessibility | 2 | 4 | Named controls/landmarks/dialogs, skip link, route focus, modal focus trap, Escape/return focus, selected-command announcement, reduced motion, axe and supplementary contrast checks. |
| Performance | 3 | 4 | Reused local fonts and existing dependencies; selective store subscriptions, stable outside-event listeners, no layout-read loop, preserved lazy drawers. Local resource/CLS smoke check described below. |
| Responsive design | 2 | 4 | 44px scoped targets, fluid popovers, tablet mobile navigation, 320–1280px reflow at 200% text; inspected screenshots. |
| Theming | 3 | 4 | Semantic text/warning/control/header tokens, light/dark/mono checks including populated and hover states, system preference and forced colors. |
| Implementation integrity | 3 | 4 | Shared primitives and translations retained; removed fabricated user name, duplicate fallback copy and redundant eyebrow; mono no longer inherits the green header wash. |
| Total | **13/20** | **20/20** | Initial state → final scoped review; intermediate score was 15/20. |

## Executive summary of the deeper pass

Ten additional finding clusters addressed: **P0: 0, P1: 4, P2: 6, P3: 0**. No known unresolved finding remains in the tested shared-shell scope. This does not clear feature-specific chart/form issues, authentication/security, other projects, or production deployment. The `$audit` rubric prompted explicit keyboard, populated-state, theme, responsive and performance checks rather than a visual-only reskin.

### Additional findings and resolution

| Severity / category | Location | User impact / standard | Resolution / recommended command |
|---|---|---|---|
| P1 Accessibility/Theming | `mainTheme.css`, `TradingWorkspaceHeader`, `LevelBadge`, `NotificationsMenu`, `CommandPalette` | Header and hover text could fall below 4.5:1; warning colors assumed a dark surface (WCAG 1.4.3). | Strengthened muted tokens and introduced semantic warning/accent tokens; tested settled hover and populated states. Fixed — `$impeccable colorize`. |
| P1 Accessibility | `GlobalSearch`, `Drawer`, `CommandPalette` | Search/dialogs lacked accessible names (WCAG 4.1.2). | Labelled controls, result region, drawer and command dialog; announced keyboard-selected command. Fixed — `$impeccable harden`. |
| P1 Accessibility | `MainLayout`, `RouteAccessibility`, `CommandPalette`, `useClickOutside` | No skip destination; command dialog allowed Tab to escape; popovers lacked Escape; navigation could steal modal focus (WCAG 2.1.1, 2.4.1, 2.4.3). | Reused modal focus hook; added skip link, delayed-heading title updates and modal-safe route focus. Escape returns to trigger, focus leaving dismisses a popover. Fixed — `$impeccable harden`. |
| P1 Responsive | `TopBar`, `Sidebar`, `MobileTabBar`, `TradingWorkspaceHeader`, `mainTheme.css` | 200% text caused clipped controls/wordmark and illegible word fragments (WCAG 1.4.4, 1.4.10). | Wrapping header, capped spacing/sidebar width, tablet mobile navigation and two-row bottom navigation when text needs space. Fixed — `$impeccable adapt`. |
| P2 Responsive | `LevelBadge`, `NotificationsMenu`, `UserMenu` | Right-anchored popovers extended beyond a narrow screen. | Viewport-bounded small-screen panels with scroll limits; anchored desktop panels retained. Fixed — `$impeccable adapt`. |
| P2 Responsive | `TopBar`, `LevelBadge`, `NotificationsMenu`, `UserMenu`, `Drawer`, `MobileTabBar`, `TradingWorkspaceHeader` | Small touch targets required precise taps. | Scoped targets reach 44px. This is the project guideline, not a claim that every smaller control violates WCAG AA. Fixed — `$impeccable adapt`. |
| P2 Accessibility | `DropdownPanel`, `Drawer` | Reduced-motion users still received translation/scale transitions. | Remove movement when requested; keep short opacity feedback. Fixed — `$impeccable animate`. |
| P2 Accessibility/Integrity | `RouteAccessibility`, `core.ts`, `CommandPalette` | Thai pages retained an English document language and English command-group labels (WCAG 3.1.1). | Synchronize document language; translate groups and new accessible labels. Fixed — `$impeccable clarify`. |
| P2 Theming/Integrity | `UserMenu`, `TradingWorkspaceHeader`, `mainTheme.css` | Fixed “Min” identity misrepresented the user; green wash persisted in mono. | Use existing auth metadata or a single neutral fallback; tokenized heading surface and removed redundant eyebrow. Fixed — `$impeccable distill`. |
| P2 Performance | `TopBar`, `ThemeToggleSwitch`, `MobileTabBar`, `useClickOutside` | Whole-store subscriptions and changing callbacks caused avoidable rendering/listener work. | Subscribe to needed fields; retain stable document listeners with a current callback ref. No new runtime dependency. Fixed — `$impeccable optimize`. |

Final `$impeccable polish`-style verification: normal and enlarged-text screenshots inspected; shortened mobile labels retain full accessible destination names and do not cut words at normal size. Existing navigation destinations and financial logic are unchanged.

## Findings and actions

Historical first-pass findings: P0: 0, P1: 1, P2: 3, P3: 0. These remain resolved; they are separate from the ten deeper-pass clusters above.

1. **P1 — Trading primary action contrast in light mode.** `src/features/trading/components/TradingWorkspaceHeader.tsx`: dark text was paired with a dark brand-filled button. This makes the main action harder to read (WCAG 1.4.3). Changed the label to white; with the scoped green action it measures **6.56:1**, hover **4.97:1**. Suggested command: `$impeccable colorize`. Fixed.
2. **P2 — Main/All visual identity mismatch.** `src/styles/index.css`, `src/layouts/Sidebar.tsx`: violet actions, neutral zinc surfaces, default typography, and a gradient badge differ from All's established identity. Introduced `src/styles/mainTheme.css`, scoped palette remapping, shared fonts and a simple wordmark. Kept mono achromatic and light mode usable instead of forcing dark. Suggested command: `$impeccable colorize`. Fixed within the shared shell; individual data-chart palettes intentionally retained.
3. **P2 — Theme switch touch target.** `src/components/ui/ThemeToggleSwitch.tsx`: the previous 36×20px control was difficult to hit. Its target is now 44×44px without changing the visible track or accessible switch state. The 44px target is a project usability guideline; no unsupported claim that every smaller target violates WCAG AA. Suggested command: `$impeccable adapt`. Fixed.
4. **P2 — Route translation ignores reduced motion.** `src/layouts/MainLayout.tsx`: route changes always moved vertically. The existing motion library now resolves reduced-motion preference and removes translation while preserving a short opacity state transition. Suggested command: `$impeccable animate`. Fixed for this transition; other feature animations were not part of this pass.

## Patterns and positive findings

Central brand tokens already reach most shared controls, so a scoped variable map avoids mass component rewrites. Existing lazy routes, semantic native buttons/links, labelled switch, dark-mode variants and responsive navigation were preserved. No global animation kill, live-data change, or saved-preference migration was introduced.

Palette checks: selected navigation ink/mint **11.65:1**; dark secondary text/canvas **8.12:1**; updated light muted text/white **6.10:1**; dark focus/canvas **16.98:1**. Supplementary checks for axe's unresolved wrapped/clipped-text nodes measured level text **6.10 / 9.65 / 5.68:1** in light/dark/mono and Tools text **6.61 / 10.81 / 7.40:1**. These check rendered foreground/background pairs, not arbitrary image overlap or every feature's chart palette. Axe `incomplete` results were reviewed separately, not silently counted as passes.

## Verification and next steps

Final validation: production Build/TypeScript passed; **93 related unit/integration tests** and **23 Chromium E2E tests** passed. Scoped Oxlint and separately invoked ESLint passed; `git diff --check` reported no whitespace errors. Full `npm run lint` exited 0 but still reports unrelated warnings in installed `.agents`, `.claude` and `.github` skill code. Those files were not rewritten to improve this score.

Reproduction:

```text
npm run build
npm run lint
npx vitest run src/layouts src/platform/commandPalette src/components/ui src/providers/ThemeEffect.test.tsx src/components/settings/ThemeSettings.test.tsx src/features/trading/pages src/hooks/useClickOutside.test.tsx src/hooks/useGlobalSearch.test.ts src/hooks/useNotifications.test.ts
npx playwright test e2e/main-shell-audit.spec.ts e2e/main-theme.spec.ts e2e/header.spec.ts --workers=2
```

The E2E suite covers light/dark/mono at 320, 768 and 1280px; existing theme checks add 390px; reflow checks use 320, 390, 768, 1024 and 1280px with 200% root text. It exercises Thai, named landmarks, keyboard skip, modal trapping/return focus, Escape, populated search and budget alerts, dismissing alerts, system/manual theme switching, forced colors, reduced motion, touch targets and viewport bounds. Fixtures are synthetic local data, not a live account. Color checks wait for entrance/exit and hover transitions to settle; measuring a fading panel had produced false transient failures during test development.

Local performance smoke evidence on `/trading`: initial snapshot CLS **0.00019** (test budget ≤0.1); last sample observed no >50ms long-task entry before that checkpoint, with an earlier concurrent sample measuring 65ms. Initial decoded JavaScript including modulepreloads was **1,659,729 bytes**; the smaller script-initiated subtotal must not be mistaken for total JS. Trade/transaction drawers, export libraries and Workouts were absent from the initial resource snapshot. Production CSS was **14.14 kB gzip**. Existing PWA background precaching remains (about 3.73 MiB across 134 entries); this is not a claim that unopened features are never downloaded. These are local smoke measurements, not throttled-device benchmarks, production Core Web Vitals, or a global bundle-size audit. The performance score applies to the scoped shell's implementation and retained lazy boundaries.

Scope limits: no comprehensive screen-reader/device matrix, all-chart/form audit, field performance measurement, auth/security re-audit, or live deployment verification was performed. Those are **not certified by 20/20**. A broader application-wide score requires a separate audit of those surfaces; recommended sequence is `$impeccable audit` on populated feature screens, appropriate fixes, then `$impeccable polish`. No commit, push or deployment was performed. All changes remain local and preserve concurrent workspace work.
