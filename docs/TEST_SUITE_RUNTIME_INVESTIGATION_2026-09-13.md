# Test-suite runtime investigation (2026-09-13)

The focused plan asked for a reproducible check of the Nexus full-suite runtime. Two full-suite attempts using Vitest threads (`--maxWorkers=4` and `--maxWorkers=8`) were stopped after more than seven minutes without a final report. The run showed existing stderr from Capacitor duplicate registration, jsdom navigation and malformed-row diagnostics, but no assertion failure before stopping.

The repeatedly visible files were then run independently with one worker and all passed:

| File | Result | Duration |
|---|---:|---:|
| `src/layouts/TopBar.test.tsx` | 9/9 | 7.26 s |
| `src/features/finance/pages/Transactions.integration.test.tsx` | 16/16 | 12.58 s |
| `src/features/finance/pages/RecipientLearning.integration.test.tsx` | 2/2 | 9.74 s |
| `src/features/finance/slipScanner/components/GalleryScanFlow.test.tsx` | 4/4 | 6.62 s |

No production code was changed. The current evidence supports a suite-scale runtime investigation rather than a verified product defect; keep this as a P2 maintenance item and avoid changing tests or product behavior without a narrower reproduction.
