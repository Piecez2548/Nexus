# RB-021 — Supabase production verification (2026-09-13)

Read-only verification was run against the linked production project `hgstufaswzmxjezanpyh` in region `ap-northeast-1`. No production rows or secrets were changed.

## Results

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.6.
- Migration parity: 8 local migration files and all 8 remote versions matched (`20260908133500` through `20260913095000`).
- `supabase db lint --linked`: no schema errors.
- Public tables observed: `synced_records`, `user_encryption_keys`, `device_pairing_requests`, `mfa_backup_codes`, `mfa_backup_code_attempts`, and `ai_coach_daily_usage`; RLS was enabled on all six.
- Owner policies were present for synced records, encryption keys, pairing requests, AI usage and AAL2-gated backup-code rows. The rate-limit attempt table intentionally has no client policy and is only reached by the redemption routine.
- Function ACL inspection confirmed `redeem_mfa_backup_code(text)` is executable by `authenticated` and `service_role`, with `public`/`anon` revoked. `increment_ai_coach_usage()` remains an invoker function.

## Findings that remain open

Supabase security advisors still report three release-relevant findings: leaked-password protection is disabled; the intentional `SECURITY DEFINER` backup-code RPC is callable by `authenticated`; and the attempt table has RLS enabled without a policy. Performance advisors also report the existing AAL2 policy init-plan warning and two unused-index informational notices. These require a named Security/Database owner decision and, where applicable, a controlled migration or compensating-control record.

The local `schema.sql` contains the optional weekly-digest table/function, but those objects are not present in this production project because no corresponding migration is in the linked migration history. This is recorded as a feature-scope parity decision for the owner; it was not applied automatically.

RB-021 remains **In Progress** pending the appointed Security/Database reviewer, leaked-password decision and an explicit decision on optional automation objects. This evidence is technical verification only and does not close a release blocker.
