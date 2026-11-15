**Title:** Phase 0: Hub at root, ScreenTutor fail-closed, Android scanner fix, remove xauusd-ai-trader

## Summary
- **Entry routing**: web `/` and `/index.html` now render the Nexus All hub instead of ScreenTutor; ScreenTutor moves to `/screentutor` (behind the Nexus account gate, like the hub) and the hub card links there; PWA manifest renamed to Nexus.
- **ScreenTutor**: provider state is explicit (initializing/ready/unavailable/error/demo); empty responses are rejected and every result is labelled with its source instead of a hardcoded sample answer.
- **Android slip scanner**: permission denied/blocked/unavailable states, manual gallery scan, diagnostics panel, and `VITE_NEXUS_SCANNER_SAFE_MODE` (review-only, no transaction writes).
- **Docs**: 2026-09-30 audits, Phase 0.1–0.4.2 reports, all-systems summary, release manifest and commit plan.
- **Cleanup**: removes `xauusd-ai-trader/` (130 files), a separate trading-bot project committed here by mistake in 67b3cfd.

## Testing
Each commit was checked in a clean worktree with `tsc -b`, `oxlint` and `vitest run`:
- entry: 2,896/2,896 passed
- screentutor: tsc/lint clean; 2 unrelated flaky tests (`TopBar` gallery scanner, `TradingDashboard` zeroed stats) failed in the full run and passed on rerun
- scanner: 2,926/2,926 passed
- docs: tsc/lint clean
- xauusd removal: 2,922/2,922 passed (4 xauusd frontend tests no longer collected)

After merge, verify on production: `/` shows the Nexus All sign-in/hub, and `/screentutor` and `/dashboard` redirect to sign-in when signed out.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
