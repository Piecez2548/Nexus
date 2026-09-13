# Cloud-sync security maintenance (2026-09-13)

This check keeps the optional Supabase sync path safe for the current personal/demo scope. It was read-only; no production rows, secrets or migrations were changed.

## Evidence

- `npx supabase db lint --linked` passed with **no schema errors** in both the recorded production verification and this follow-up run.
- The linked project remains migration-complete at 8/8 migrations, with RLS enabled on all six observed public tables and the intended MFA redemption RPC ACL.
- The completed isolated application suite passed 451/451 files and 2,837/2,837 tests, including sync, encryption, authentication and recovery coverage.
- A linked schema diff could not run because this workstation has no Docker/Podman runtime for Supabase's shadow database. This is an environment limitation, not evidence of drift.

## Decisions retained

- The MFA redemption routine remains a deliberately constrained `SECURITY DEFINER` RPC. It validates the authenticated user, normalizes the code, applies the five-attempt/15-minute limiter and exposes no client policy on the attempt table.
- The weekly digest table/function remains optional and is not present in the linked production migration history. The client treats a missing table as an empty digest, so no production migration is required for the current ordinary personal/demo scope.
- Supabase advisor findings (leaked-password protection, the intentional authenticated MFA RPC grant, the policy-less rate-limit table and informational index/init-plan notices) remain explicit owner decisions for a future pilot/launch. No unsafe workaround was applied.

## Result

Cloud-sync security maintenance is **verified for current scope**. Keep the advisor decisions and Docker-backed schema-diff check as deferred release work until the app moves to public, paid, organizational or real-data use.
