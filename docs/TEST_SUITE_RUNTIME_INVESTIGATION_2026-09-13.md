# Test-suite runtime investigation (2026-09-13)

The focused plan asked for a reproducible check of the Nexus full-suite runtime. Two full-suite attempts using Vitest threads (`--maxWorkers=4` and `--maxWorkers=8`) were stopped after more than seven minutes without a final report. A third isolated run with `--maxWorkers=16` completed successfully in 307.27 seconds. The run showed existing stderr from Capacitor duplicate registration, jsdom navigation and malformed-row diagnostics, but no assertion failure.

The repeatedly visible files were then run independently with one worker and all passed:

| File | Result | Duration |
|---|---:|---:|
| `src/layouts/TopBar.test.tsx` | 9/9 | 7.26 s |
| `src/features/finance/pages/Transactions.integration.test.tsx` | 16/16 | 12.58 s |
| `src/features/finance/pages/RecipientLearning.integration.test.tsx` | 2/2 | 9.74 s |
| `src/features/finance/slipScanner/components/GalleryScanFlow.test.tsx` | 4/4 | 6.62 s |

No production code was changed. The current evidence supports a suite-scale runtime investigation rather than a verified product defect; keep this as a P2 maintenance item and avoid changing tests or product behavior without a narrower reproduction.

## Interpretation

The completed run was **451/451 files and 2,837/2,837 tests passed**. Vitest reported 3,069.40 seconds of cumulative jsdom environment time, which explains why increasing workers improves wall time without changing test behavior. A `--no-isolate` experiment completed faster but failed 91 tests across 25 files because state and mocks leaked between files; it is not a safe default. The existing isolated configuration therefore remains unchanged. The practical full-suite command on this workstation is:

```text
npm test -- --maxWorkers=16 --pool=threads --reporter=dot
```

This resolves the immediate uncertainty (the suite is green when allowed to finish) while leaving a future P2 optimization opportunity to reduce per-file jsdom startup cost.
