# SYNC-CONFLICT-001 — offline/conflict/outage drill

Date: 2026-09-12 (Asia/Bangkok)

Status: **all three discovered defects have implementation fixes**: [SC-001](SYNC_CONFLICT_FIX_001_2026-09-12.md), [SC-002](SYNC_CONFLICT_FIX_002_2026-09-12.md) and [SC-003](SYNC_CONFLICT_FIX_003_2026-09-12.md). The original nine scenarios have been extended to seventeen, all passing without expected-failure markers. Physical offline/reconnect verification remains separate.

## Method and limits

`src/features/sync/syncConflict.test.ts` runs the real sync engine and transaction repository against fake-indexeddb. Two synthetic devices alternate separately saved copies of every database table, including pull/push cursors and queued tombstones. The relay applies user/table/ID/cursor filters, gives writes server-side timestamps independent of the device clock, and implements the terminal-tombstone behavior of the checked-in `set_synced_records_updated_at` SQL trigger.

All fixtures and errors are synthetic. This does not exercise Postgres, production RLS, Supabase capacity, the network stack, physical radios, or two devices running simultaneously. The simulated delete/write race inserts a deletion at a deterministic point between preflight and upsert. The initial drill did not verify production trigger configuration; deployment evidence is in the SC-001 report. Later regressions include encrypted transaction retry and peer decryption, but do not establish account/key recovery behavior.

The initial relay intentionally did not invent a server stale-update guard: at drill time the checked-in trigger prevented tombstone resurrection but otherwise accepted the incoming live payload. The SC-001 remediation added the atomic guard to both the SQL trigger and relay model.

## Acceptance matrix

| Scenario | Result | Evidence |
|---|---|---|
| Offline create/edit/delete, then reconnect | PASS | Local rows, cursors and tombstone queue preserved during outage; both devices converge to exactly two expected rows after reconnect. |
| Pull failure after a successful upload | PASS | Pull cursor remains unchanged on failure and advances after retry; no duplicate row. |
| Deletion committed but acknowledgement lost | PASS | Pending tombstone retained, retry clears the queue, stale peer receives deletion. |
| Remote deletion between preflight and upload | PASS in relay | Modelled server trigger retains the tombstone; pull removes the stale local copy. |
| One table's upload fails, another table succeeds | PASS | Pending transaction retained, independent todo uploaded, transaction retry succeeds in the uncomplicated case. |
| Two offline edits, older edit reconnects first | PASS | Both devices and cloud converge to amount 120. |
| Two offline edits, newer edit reconnects first | **PASS after SC-001 fix** | Both devices and cloud converge to amount 120 with the deployed atomic stale-live guard. |
| Device clock moves behind its prior push cursor | **PASS after SC-002 fix** | Local amount 130 reaches the cloud and the restored peer. |
| New row after rollback with an empty table | PASS | Durable clock/push floor keeps the new row eligible for upload. |
| Edit in the same millisecond as previous sync | PASS | New version is beyond the nudged push cursor and reaches the cloud. |
| Encrypted clock-rollback edit | PASS | Cloud retains ciphertext and the peer decrypts the updated amount 160. |
| Legacy-row backfill after rollback | PASS | Allocated metadata exceeds the existing push cursor and reaches the relay. |
| Failed upload plus a pull containing an older copy of that row and another newer record | **PASS after SC-003 fix** | Cursor remains at/before the pending version through repeated failures; retry and peer converge to 120. |
| Malformed same-ID payload after upload failure | PASS | Rejected payload does not acknowledge the local edit; retry reaches amount 180. |
| Local edit after applying its ID, before another newer remote row | PASS | Exact-version comparison preserves the pending edit; retry reaches amount 190. |
| Stuck cursor on an installation that already ran v1 repair | PASS | v2 repair replays pending amount 200 and runs only once. |
| Encrypted upload failure then retry | PASS | Cloud retains ciphertext; peer decrypts the recovered edit to amount 210. |

## Findings and correction order

### SC-001 — High: stale upload overwrites the cloud and leaves devices divergent — fixed

Reproduction: both devices start with amount 100. Device A edits to 110 at time 10; device B edits to 120 at time 20. B reconnects and sends 120 first. A later sends 110 and overwrites the cloud. B's pull rejects the older `data.updatedAt`, retaining 120 locally, while A/cloud stay at 110. Repeating three rounds does not resolve the disagreement.

At discovery, `pushTable` preflighted only tombstones and the SQL trigger did not compare live versions. `pullTable` did compare device timestamps, so the two directions applied incompatible conflict rules. An earlier comment describing redundant upserts as harmless was invalid in that interleaving.

Resolved by **SYNC-CONFLICT-FIX-001**. The deployed Postgres trigger atomically preserves the newer live payload by canonical `data.updatedAt`, retains delete-wins behavior and refreshes the server pull timestamp. Both reconnect orders now pass as ordinary acceptance tests. See the [fix and deployment report](SYNC_CONFLICT_FIX_001_2026-09-12.md).

### SC-002 — High: clock rollback can discard a local edit — fixed

Reproduction: sync a row at device time 100, then move the clock to time 10 and edit amount 100 to 130. `withSyncMeta` stamps the edit with wall-clock time 10. `pushTable` selects only rows at/above its existing watermark, so the edit is not uploaded. The pull comparison then considers the old cloud copy newer and writes amount 100 over the local edit.

Resolved by `writeLocalSyncRows`: local versions and row writes now commit atomically above the persisted table clock, push watermark and newest stored version. Shared repositories and encryption migrations reuse it. Clock rollback, same-millisecond edits and encrypted peer convergence pass; separate storage tests cover restart, concurrent connections and atomic rollback. See [fix report](SYNC_CONFLICT_FIX_002_2026-09-12.md).

### SC-003 — High: pull watermark skips an unsent edit after an upload failure — fixed

Reproduction: a local row is edited to 120 at time 20; its upload fails. The pull contains the cloud's old copy of that same ID plus another record at time 30. The old copy is correctly skipped, but `pulledSyncIds` includes every fetched row, including the one never applied. The pending-row cap therefore excludes the unsent local edit and nudges the push watermark beyond it. Subsequent healthy passes still leave the cloud at 100.

Resolved by tracking successfully applied versions, comparing the pending row's exact version, and checking/advancing the push cursor in one transaction. v2 cursor repair also reconsiders skipped rows on existing installations. See [SC-003 report](SYNC_CONFLICT_FIX_003_2026-09-12.md).

## Validation and expected-failure policy

- Initial run with ordinary acceptance assertions: **6 passed / 3 failed**. Failures were the exact value mismatches above, not runner errors.
- SC-001, SC-002 and SC-003 now use ordinary passing assertions. No `it.fails` remains in this drill. **An expected failure, if introduced for a future finding, remains an open defect rather than passed acceptance.**
- Current focused drill: **17/17 passed**. See [SC-003 verification](SYNC_CONFLICT_FIX_003_2026-09-12.md) for current validation and delivery evidence.
- Historical SC-001 related suite: **21 files, 157 passed / 2 expected failures**, covering sync/auth, transaction-store integration and encrypted repositories.
- TypeScript and `npm run build:release`: passed, including bundle budget (200 JS chunks, 3708.1 KiB total, largest 454.9 KiB).
- Configured lint (`npm run lint`, Oxlint): passed. The project has no application ESLint setup; no separate ESLint result is claimed.

Commands:

```text
npx vitest run src/features/sync/syncConflict.test.ts --maxWorkers=1
npx vitest run src/features/sync src/features/finance/store/transactionStore.integration.test.ts src/database/encryptedRepository.test.ts --maxWorkers=4
npm run build:release
npm run lint
```

Files changed: the new drill test, this report, `docs/TECHNICAL_DEBT.md`, `docs/TESTING_GUIDE.md`, `docs/CHANGELOG.md` and `tasks/TASK_REGISTRY.md`. Historical engineering scores and enterprise release blockers are not promoted by completion of this drill.
