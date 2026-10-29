# Fake / Misleading Feature Audit — 2026-09-30

Findings below concern expectation gaps, not claims of malicious intent. “Severity” uses the user's P0–P4 definitions. No fix was applied where a product decision is needed.

| Feature | File | UI evidence | Actual implementation | Expected vs actual | Severity | Recommended action |
|---|---|---|---|---|---|---|
| ScreenTutor analysis without Ollama | `src/features/screentutor/ScreenTutorApp.tsx`; `src/features/screentutor/services.ts` | Capture/Explain flow produces a normal-looking result overlay; default OCR text is a built-in sample | When Ollama is unavailable it waits briefly then calls `makeDemoAnalysis()`. Multiple-choice output hardcodes answer C and canned rationale. README mentions demo fallback but in-result trust label should be evaluated. | Expected a grounded explanation of captured content; actual may be canned/demo and potentially wrong | P1 | Require conspicuous “Demo only—connect Ollama for analysis” label and avoid asserting a correct answer, or fail closed. Add tests for both modes. |
| Web root product identity | `src/appEntry.ts`, `src/router/router.tsx`, `index.html`, `vite.config.ts`, `electron/main.cjs` | Root entry branding and Vercel landing product | Web `/` opens ScreenTutor; `/projects` Nexus All; `/dashboard` Nexus Main. Android `/` opens All. Electron opens built root URL and therefore likely opens ScreenTutor. PWA manifest is ScreenTutor. | Nexus users/docs may expect main Nexus landing; current behavior varies by platform | P1 | Owner must select canonical root per target; update README/docs/manifest/smoke tests consistently. |
| “Bank” account type | `src/features/finance/schemas/accountSchema.ts`, `AccountForm.tsx` | User can create a bank-type account | Local ledger account record only; no provider/auth/link/token/sync integration to a bank was found | User may infer live connection from banking terminology | P2 | Copy should clearly say manual account. Bank Connectivity needs provider/jurisdiction decision; do not imply it exists. |
| Portfolio/trading watchlist | `src/features/portfolio/`, `src/features/trading/` | Holdings valuation and watchlist/price targets | User-entered prices/symbols; no live feed or broker execution (docs/source comments) | Real-time market or trading integration is not supplied | P2 if advertised as live; otherwise informational boundary | Preserve explicit manual-data labels in UI/docs; no backend feature needed unless requested. |
| AI Analytics naming | `src/features/finance/aiAnalytics/`; `src/ai/` | “AI Analytics” and “AI Coach” | Main analytics are deterministic local rules; optional Claude fallback is gated/opt-in and server-proxied. Separate AI Gateway has local-rule and provider wiring but no universal autonomous AI. | Could imply LLM-generated analytics across all sections | P2 expectation risk | Continue showing provenance/rule-based labels; current docs already explain this distinction. |

## No finding established

No evidence in this pass that financial dashboard values are hardcoded demo balances; database seed inserts default accounts/categories and merchant reference rows, not fabricated transactions. No empty production button handler was confirmed by this targeted scan. Absence of a finding is not a complete button-by-button proof.

## Changes

No UI behavior changed; root routing and ScreenTutor demo UX require product-owner direction.
