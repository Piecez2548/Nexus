# Incident Response Runbook

**Status:** operational template; the accountable operator must assign named people and approve it before real-data use.

## Required ownership

| Role | Named owner | Backup | Contact channel |
| --- | --- | --- | --- |
| Incident commander | REQUIRED | REQUIRED | REQUIRED |
| Security/engineering | REQUIRED | REQUIRED | REQUIRED |
| Privacy decision owner/DPO | REQUIRED | REQUIRED | REQUIRED |
| Customer communications | REQUIRED | REQUIRED | REQUIRED |
| Thai legal counsel | REQUIRED | REQUIRED | REQUIRED |

Do not begin a real-data pilot while any required owner is blank.

## First response

1. Record discovery time, reporter, affected environment and an immutable incident ID.
2. Preserve logs and evidence. Do not delete or overwrite affected records.
3. Contain access: disable compromised accounts/keys, revoke sessions, isolate affected integrations and rotate exposed secrets.
4. Determine affected data categories, people, systems, countries, duration and whether confidentiality, integrity or availability was affected.
5. Notify each relevant processor immediately under the contracted escalation SLA and preserve their incident timeline.
6. Start the PDPA risk assessment clock. Where a personal-data breach is likely to create risk, notify the PDPC without undue delay and, where feasible, within 72 hours of awareness. Assess notification to affected people separately when high risk is likely.
7. Record the reason, evidence and approver for every notify/do-not-notify decision. Counsel/DPO owns the legal conclusion.

## Recovery and closure

- Restore only from verified data and run authentication, RLS, sync-integrity and production smoke tests before reopening access.
- Communicate known facts, user actions and update cadence without unsupported assurance claims.
- Produce a timeline, root cause, affected scope, control failures, corrective actions, owners and due dates.
- Run a tabletop exercise before pilot and after every material architecture or processor change.

Reference: `LEGAL_PRIVACY_READINESS_2026-09-09.md`. This runbook does not replace legal advice.
