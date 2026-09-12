# SYNC-LATENCY-FIX-001 — early pulled-store refresh

Date: 2026-09-13 (Asia/Bangkok)

Status: **Completed, published and verified on the physical Android device.**

## Problem and change

Live diagnosis established that a changed transaction could already be stored on Android but remain absent from the UI for another 4.469–6.783 seconds. `runFullSync()` accumulated changed table names and refreshed their Zustand stores only after all 24 sequential pulls and account/category deduplication finished.

`runFullSync()` now refreshes a successfully changed table immediately after that table's pull completes. The existing final refresh is retained after deduplication because merging duplicate accounts or categories can rewrite transaction references and must finish with consistent finance views.

The first physical post-deployment pass exposed a second barrier: the early transaction refresh still spent about 4.586 seconds decrypting every encrypted transaction again on Android. Encrypted repositories now retain decrypted content for unchanged envelopes in a DEK-scoped in-memory cache. The envelope key includes its version, IV and ciphertext; an encrypted write creates a new key, and a replacement DEK receives a separate WeakMap cache. Reads reconstruct fresh row objects, so callers cannot mutate later reads through a cached reference.

The change is deliberately limited to refresh timing. Push/pull order, sequential network execution, version comparison, push-cursor transactions, tombstones, error collection, deduplication and the five-second scheduler are unchanged.

## Files modified

- `src/features/sync/syncEngine.ts`: early per-table store refresh, followed by the existing final reconciliation refresh.
- `src/features/sync/syncEngine.test.ts`: regression that holds a later unrelated table open and proves the transaction store refreshes before the sync promise resolves.
- `src/database/encryptedRepository.ts`: session-key-scoped decrypted-content reuse for unchanged encrypted envelopes.
- `src/database/encryptedRepository.test.ts`: cache reuse, invalidation, reference-isolation and DEK-isolation regressions.
- Architecture, testing guide, roadmap, changelog, task registry and this report.

## Validation

- Focused sync engine/conflict/provider/encrypted-repository tests: **63/63 passed**.
- Related sync, local-version, encrypted-repository, encryption-migration and finance-repository/store tests: **30 files, 224/224 passed**.
- Desktop/mobile transaction browser checks: **10/10 passed**.
- TypeScript project build: passed.
- Configured lint (`npm run lint`, Oxlint): passed.
- Final release build and bundle budget: passed — 200 JavaScript chunks, 3709.3 KiB total, largest 454.9 KiB.
- Final Vercel production smoke checks: **2/2 passed**, including the mobile cold-login performance gate.
- Final Android debug APK build/signature/install: passed; SHA-256 `AEB039AC44626519A3C83ADF1AD89776A21CFA8C65B7B52FE3B51B7A0D0488F3`.

## Physical result

Three controlled foreground updates were published with distinct encrypted envelopes while the installed Android client retained the prior local value. Resource timing and DOM observation were armed before each cloud write. The Android transaction pull and the matching rendered amount were then measured in the same WebView clock:

| Round | Pull duration | Pull response to rendered UI | Cloud write to rendered UI |
| --- | ---: | ---: | ---: |
| ฿41 | 215.5 ms | 71.6 ms | 4,571 ms |
| ฿42 | 191.2 ms | 69.1 ms | 5,654 ms |
| ฿43 | 450.7 ms | 69.5 ms | 8,136 ms |

Median pull-response-to-UI latency is **69.5 ms**, down from the diagnosed 4,613 ms median: a **98.5% reduction**. The remaining end-to-end wait is dominated by when the five-second scheduler can begin another long sequential sync pass; it is no longer time spent holding an already-applied transaction away from the UI.

The measurement record was tombstoned in the shared cloud row, disappeared from Android in 1,390.9 ms, and the phone returned to **32 transactions**. Raw IndexedDB confirmed the local row is absent; the shared remote row is a terminal tombstone, so an older desktop copy cannot revive it.

## Publication and live acceptance

Completed in this same task:

- Deployed final Vercel production deployment `dpl_Fy7The2zBTb5jjoCkmVZdyNM7D96` and assigned the existing `https://nexus-lemon-eight-32.vercel.app` alias.
- Built, verified and installed the Android APK in place on device `10AE9R1ZJY001PY`; package data and original install time were preserved.
- Repeated three physical response-to-UI measurements against encrypted payloads and removed the temporary identity with a terminal tombstone.
- Confirmed the installed client returned to its 32-transaction baseline and no temporary local row remains.

## Limits

The change removes the confirmed post-pull UI barrier. It does not make 24-table network work parallel, shorten the five-second timer, add a mutation-triggered sync, or provide native Android background scheduling. Those are separate choices that require their own evidence and regressions.
