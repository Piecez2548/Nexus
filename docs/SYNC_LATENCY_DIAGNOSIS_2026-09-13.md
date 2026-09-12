# SYNC-LATENCY-001 — live latency diagnosis

Date: 2026-09-13 (Asia/Bangkok)

Status: **Completed — diagnosis only.** A repeatable delay between receiving a transaction and refreshing the Android UI is established. Application code and deployments were not changed. The next implementation task is planned separately.

## Finding

The sync engine waits for all 24 sequential table pulls, then deduplication, before refreshing affected stores. In three foreground samples the changed transaction had already arrived, but Android did not display it for another **4.469, 4.613 and 6.783 seconds**. The UI appeared only **0.220–0.531 seconds after the last table response**. This live sequence matches the refresh placement in the source.

This establishes an avoidable wait in the current refresh scheduling. It does not establish that this mechanism alone caused every 20–45+ second observation in the preceding live drill.

## Method

- Used the existing production website and physical vivo V2348/installed SC-003 build from [the prior live verification](SYNC_LIVE_VERIFICATION_2026-09-12.md).
- Both clients began and ended with 32 transactions. The earlier gallery scan stayed stopped; no scan overlay was present.
- Created one disposable expense named `SYNC-LATENCY-001`, Others / Cash, through Android's transaction form. Reused it for every edit and removed it afterward.
- Attached passive Playwright request/requestfinished listeners to Android's WebView. No request interception, synthetic latency, offline override, network setting change, device-clock change or application-state monkeypatch was used.
- Recorded request method, table, timing and status. Matched the disposable record's version in received transaction metadata; no auth header, account identifier, raw row payload, ciphertext or decrypted data was exported.
- Android UI arrival used a locator watcher armed before desktop save. Both responsive amount elements exist in the DOM; the Android mobile element was selected explicitly with the first visible-layout match. Desktop observations used the filtered Transactions UI.
- Timestamps are harness/tool observations. Save-action measurements begin before the automation click completes and include its interaction overhead; they are not precise database-commit-to-render measurements. Requestfinished includes response delivery to the instrumented client. No device `updatedAt` value was subtracted from harness timestamps to calculate latency.
- [Sanitized machine-readable evidence](assurance/sync-latency-2026-09-13.json) contains the three complete 24-request pull sequences, sample timestamps and hashes of the inspected source files.

## Foreground measurements

Desktop document visibility and Android document visibility were observed as `visible`. Nexus was the foreground Android activity; the scan was stopped.

| Desktop edit | Save-action start → Android UI | Transaction request duration | Transaction response → Android UI | 24-table pull sequence | Last table response → UI |
|---|---:|---:|---:|---:|---:|
| 20 → 21 THB | 10.451 s | 0.188 s | 4.469 s | 4.437 s | 0.220 s |
| 21 → 22 THB | 10.923 s | 0.172 s | 4.613 s | 4.413 s | 0.372 s |
| 22 → 23 THB | 14.066 s | 0.581 s | 6.783 s | 6.833 s | 0.531 s |

Every request in those three recorded pull sequences returned HTTP 200. The median response-to-UI wait in this small sample is 4.613 seconds; this is not a production percentile or SLA.

For Android → desktop, the later 24 → 25 THB edit was visible locally after **0.245 s**, its upload completed with HTTP 200 after **4.503 s**, and desktop changed between **14.267 and 15.032 s** after the save action began (750 ms observation interval, plus tool overhead). The remaining delay after upload was about 9.8–10.5 s. Desktop network timing was not instrumented, so that remainder cannot be divided precisely between its polling phase, pull requests and final render.

The initial Android create at 20 THB also reached desktop. Its desktop observation interval was wide (absent at +6.806 s, present at +21.865 s), so it is retained only as bounded evidence, not a precise latency sample.

## Background control

- Hiding the Codex Browser panel through its visibility capability did **not** change the webpage's reported `document.visibilityState`; it remained `visible`. The panel was restored. This is not counted as a browser-background experiment.
- Android was actually sent to Home. ADB confirmed `com.android.launcher3/com.bbk.launcher2.Launcher` as the resumed activity. The WebView still initially reported `visible`, showing that document visibility alone was insufficient to establish native foreground status in this setup.
- Desktop changed the test record to 24 while Android was at Home. The Android DOM arrival watcher timed out after 45 seconds; a subsequent DOM read also timed out. One in-flight `strategies` request had an observed completion gap of **99.148 s**, spanning this background period.
- Returning the existing Nexus activity to the foreground restored responses and the app displayed 24. No restart, unlock bypass or data reset was performed.
- The 99.148 s gap may include app suspension and delayed event delivery. It is **not** a 99-second server-response measurement. Foreground-return and final UI checks were sampled after the action, so this run does not provide a precise resume-to-render number or prove a permanent sync failure.

## Source evidence and interpretation

| Source location | Observed design | Consequence |
|---|---|---|
| `src/features/sync/components/SyncProvider.tsx:4–25` | Five-second interval plus online event; no mutation or native-resume trigger here | A save can wait for a later sync opportunity. Five seconds is a schedule, not guaranteed delivery time. |
| `src/features/sync/store/authStore.ts:182` | A request to sync returns while a pass is already running | Interval ticks during an unfinished pass do not start another pass. |
| `src/features/sync/syncEngine.ts:484–495` | All pushes, tombstones, then sequential pulls across 24 tables | Total work and network round trips accumulate within a pass. |
| `src/features/sync/syncEngine.ts:520` | Refresh affected stores only after all pulls and deduplication | A transaction received early remains undisplayed while unrelated tables finish. This is directly supported by the three foreground traces. |
| `src/features/finance/store/transactionStore.ts` | Local mutations reload the local list without calling sync | Local save speed and delivery to another device are distinct. |

The strongest actionable finding is the final refresh barrier. Source inspection also identifies scheduling contributors. Their exact shares of the full cross-device delay have not all been measured.

## Cleanup and validation

- Deleted only `SYNC-LATENCY-001`; verified no matching record on either client and reset search filters. Both unfiltered lists returned to **32 transactions**.
- Restored Nexus to the foreground and restored the desktop Browser panel. Gallery scan remained stopped.
- Removed passive listeners and the task-created TCP 9205 ADB forwarding rule; the final forwarding list was empty.
- Normal create/edit/delete flows can produce normal audit/gamification side effects. This run verifies record cleanup/counts, not a byte-for-byte restoration of those auxiliary states.
- Report, evidence JSON and task registry were checked for consistency, valid JSON and whitespace. No application implementation changed, so Build, TypeScript, lint and regression suites were not rerun or represented as new test results.

## Next task — not started

**SYNC-LATENCY-FIX-001: reduce the wait between applying a pulled transaction and updating its UI. Recommended model: Astra.**

Keep the existing services, stores, sync ordering, version guards and terminal tombstones. Make the smallest change that refreshes successfully affected data earlier, while retaining final deduplication reconciliation and error isolation. Confirm finance dependencies and deletions remain consistent; do not simply parallelize all tables or shorten the timer without evidence.

Required validation should include a deliberately delayed unrelated table proving the transaction UI can update before that delay completes, plus SC-001/002/003 conflict and retry regressions, related CRUD checks, TypeScript, configured lint and build. Measure the live response-to-UI interval again after deployment. Native background scheduling remains a separately bounded follow-up unless the implementation demonstrates it is part of the same required fix.
