# ACCOUNT-RECOVERY-DEPLOY-001

Date: 2026-09-12 (Asia/Bangkok)

Status: completed. The recovery patch is published on [Nexus production](https://nexus-lemon-eight-32.vercel.app), and the existing production smoke suite passed 2/2. No application source was changed during this deployment task.

## Deployment evidence

- Vercel project: `nexus` / `prj_CQtctwQ7CAj52flKgsXfJcQwC5fT`.
- New production deployment: `dpl_C16PWvTQ6ScS3xvXsAb91qgYUTVp`, created at 21:26:13 ICT, status **Ready**.
- Deployment URL: https://nexus-7ya4atg5q-piecez2548s-projects.vercel.app
- The public alias `nexus-lemon-eight-32.vercel.app` was inspected after deployment and resolves to this deployment.
- Previous production deployment retained for rollback: `dpl_34vm47r1KBtJcwRjDriovsHEp3Cm` / https://nexus-qxy1oa8v8-piecez2548s-projects.vercel.app. No rollback was needed or performed.
- Vercel ran `npm run build:release`: TypeScript, Vite production build and bundle budget passed. Output: 200 JavaScript chunks, 3709.2 KiB total, largest 454.9 KiB.

The completed implementation's local validation remains [35 files / 316 tests, two recovery browser tests and configured lint](ACCOUNT_RECOVERY_VERIFICATION_2026-09-12.md). Those unchanged source tests were not repeated for a deployment-only task. The configured linter is Oxlint; no separate ESLint pass is claimed.

## Published asset verification

Fetched the entry script referenced by the public production HTML and its referenced AppLockScreen chunk. Verified the local-key validation error and the account mismatch, PIN-saving failure and local-key mismatch handling markers are present. This confirms publication of the patch; it is not a substitute for exercising real account recovery.

| Asset | SHA-256 |
|---|---|
| `/assets/index-DiDf9FKt.js` | `4b03ce03e3246a48cc812b370d5f34a4ca8098c463526e7c7e12265ff82ccad9` |
| `/assets/AppLockScreen-CP8bc1Or.js` | `e710bd7e692227950db152384b395769eb7a465e58bd03e94984608c8e1753c4` |

## Production verification

Command: `npx playwright test --config=e2e/production-smoke.config.ts`

- **2/2 passed** in 25 seconds.
- Anonymous Dashboard navigation redirects to All sign-in; the PIN view does not grant anonymous access.
- Production security headers and the published login theme passed their existing assertions.
- The existing suite also checked the public Tools catalogue, its unauthenticated private API rejection, and DataLens health/security headers and unauthenticated analyze rejection. No authenticated data mutations were performed.
- At a 390px mobile viewport with cold cache, 4x CPU slowdown and throttled networking, LCP samples were 1492, 952 and 956 ms; median **956 ms**, below the 2500 ms budget. CLS was **0** in all three samples. These are lab results from this run, not population-wide performance claims.

## Remaining limits and next task

No production password was reset, recovery email sent, or account data modified. Real mailbox-link recovery, production MFA recovery and physical Android recovery remain unverified. The Android APK was subsequently rebuilt and installed under [ACCOUNT-RECOVERY-ANDROID-001](ACCOUNT_RECOVERY_ANDROID_2026-09-12.md); that task verified packaging and launch, not a live recovery operation.

The proposed Android build/install is now complete. Live account recovery needs a dedicated test account and mailbox, rather than resetting the owner's production credentials.

Files updated: this report, `docs/ACCOUNT_RECOVERY_VERIFICATION_2026-09-12.md`, `docs/CHANGELOG.md`, and `tasks/TASK_REGISTRY.md`.
