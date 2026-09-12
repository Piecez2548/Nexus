# SYNC-LIVE-VERIFY-001 — desktop/Android live verification

Date: 2026-09-12–13 (Asia/Bangkok)

Status: **Completed for the live scenarios below, with explicit coverage limits.** Both clients ended with 32 transactions and no temporary test records. No application code was changed or redeployed in this task.

## Environment and method

- Production website in the Codex desktop browser and the physical vivo V2348 running Nexus. Both Settings pages showed the same signed-in account, encryption enabled, and 32 transactions before mutation. Account identifiers and credentials are omitted.
- The current release was deployed and the Android APK installed and verified in [SC-003](SYNC_CONFLICT_FIX_003_2026-09-12.md). That earlier asset/install evidence is separate from this live run.
- All mutations used actual transaction forms and uniquely named `SYNC-LIVE-VERIFY-001-*` disposable expense records, Others / Cash. No existing user transaction was intentionally edited or deleted.
- Desktop was exercised in both the narrow panel layout and the wider table layout as the panel size changed. Android used its actual WebView through temporary ADB/CDP access.
- Offline conditions used Playwright's Android WebView context offline override. Upload failures used request routing on that WebView. Device radios, system connectivity and clocks were not changed; desktop stayed online.
- The user unlocked both clients. Android hard navigation and a replaced desktop tab required fresh unlocks. The user also explicitly authorized cancelling an Android gallery scan that blocked the form. It showed zero imported records when cancelled.

## Results

| Scenario | Observed outcome |
|---|---|
| Desktop → Android create/edit/delete | D appeared as one record at 1 THB, changed to 2 THB, then disappeared on both. Pass. |
| Android → desktop create/edit/delete | M appeared as one record at 3 THB, changed to 4 THB on desktop, then disappeared after Android deletion. Pass. |
| Android offline edit → desktop | C started at 5 THB on both. Android changed to 6 offline; desktop remained 5. After reconnect, desktop became 6. Pass. |
| Desktop edit → offline Android | Android retained C=6 while desktop changed to 7. Reconnecting Android produced C=7 there. Pass. |
| Older offline Android edit versus newer desktop edit | Android saved C=8 offline, then desktop saved C=9. Reconnecting Android converged both to 9. Pass. |
| Newer offline Android edit versus older desktop edit | Desktop saved C=10, then offline Android saved C=11. Desktop remained 10 before reconnect and became 11 afterward; Android retained 11. Pass. |
| Delete versus edit of an unaware offline copy | Desktop deleted C while Android was offline. Android subsequently edited its remaining copy to 12. Reconnect removed C from Android; C did not reappear on desktop. Pass. |
| Failed upload plus successful newer pull, then retry | F remained 18 locally while desktop F was 17; Android downloaded G=19 during deliberately failed uploads. Removing the failure rule allowed F=18 to reach desktop. Pass; details below. |
| Cleanup | All five test identities D, M, C, F and G removed. Zero prefix matches and 32 unfiltered transactions verified on each client. Pass. |

These are observed live outcomes, not a new automated test-suite count.

## Selective failure evidence

The first fault rule matched a plaintext title, but encrypted sync payloads do not expose that title. It blocked zero requests and is **not** counted as failure-test evidence.

The valid repetition temporarily rejected Android POST requests containing transaction rows while allowing GET requests and other tables:

1. With Android offline, desktop changed F to 17.
2. Android subsequently saved its newer F=18 locally.
3. Desktop subsequently changed G to 19, newer than the pending F edit.
4. Android reconnected with the upload-failure rule active. Three transaction upload attempts were aborted before removing the rule. A successful transaction GET returned two versions; Android displayed G=19 while preserving local F=18. Desktop still displayed F=17 and G=19.
5. The rule was removed. The next observed upload returned HTTP 200, and desktop subsequently displayed F=18 with G=19 unchanged. The pending edit was not skipped after the successful newer pull.

Only request method/path, status, table filter, counts and version metadata were recorded. No credential or transaction export was saved. Encrypted payload contents were not decrypted by the test harness.

## Cleanup and validation

- Deleted only the five named test identities through the UI; verified absence on both clients after sync.
- Reset transaction search filters; both clients returned to **32 transactions**, matching initial counts.
- Restored Android WebView online state and removed the temporary request-routing rules. Removed task-created ADB forwarding on TCP 9204; the final forwarding list was empty.
- Kept the final website tab available. The gallery scan remains cancelled as the user requested.
- Updated this report and `tasks/TASK_REGISTRY.md`. Reviewed the final diff and whitespace. Build, TypeScript, configured lint and unit/E2E suites were not rerun because this task changed documentation only; prior SC-003 checks remain separate.

## Limits and next action

- Early desktop-to-phone arrival was delayed: initial create exceeded a 20-second wait and edit exceeded the first 45-second wait before appearing. Android has two responsive amount elements in the DOM; the edit wait later encountered both at the expected value. A scan was active during part of the run, and browser lifecycle changes interrupted observation. This does not establish the cause or reliable latency. The source's 5-second scheduler interval is not an end-to-end delivery guarantee.
- Both edit orderings were tested with **Android offline and desktop online**. Taking both devices offline and reversing their physical reconnect order was not performed. Do not describe this run as physical coverage of both reconnect permutations.
- Actual radio/network outages, device-clock rollback, app termination during an offline queue, and long-duration stress were not tested here. Clock-rollback evidence remains the separate SC-002 controlled regression.
- Final counts and test-prefix absence are verified; a byte-for-byte comparison of every pre-existing record, balance history, audit log or gamification state was not performed.
- Recommended next task: **SYNC-LATENCY-001**, measure and investigate delivery delay with the gallery scan stopped and client foreground/background state controlled. Establish the cause before changing implementation; preserve sync correctness. Recommended model: **Astra**, as a judgment for this cross-client diagnosis, informed by [OpenAI's model description](https://developers.openai.com/api/docs/models/gpt-6-astra). This next task has not started.
