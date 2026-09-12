# Data Retention and Rights Runbook

**Status:** implementation template. Retention periods and the accountable operator require legal/DPO approval before real-data use.

## Inventory that requires an approved period

Supabase authentication and audit logs; synced records and tombstones; encryption-key envelopes; MFA backup-code hashes; device-pairing requests; weekly digests; AI usage records; Vercel function/access logs; Sentry events when enabled; Tools Blob objects; DataLens request/platform logs; exported reports and plaintext backups held by the user.

For each item, record purpose, lawful basis, system/region, controller/processor, access roles, retention trigger, exact period, deletion mechanism, backup expiry, legal hold and verification evidence. “As needed” and “request only” are not measurable periods.

## Data-subject request workflow

1. Receive requests through the published privacy contact and issue a case ID.
2. Verify identity proportionately without collecting unnecessary identity documents.
3. Search local, synced, authentication, operational, processor and backup locations.
4. Classify access/copy, correction, deletion, restriction, objection or withdrawal and record any lawful exception.
5. Execute changes across primary systems and processor requests; record backup expiry where immediate deletion is impossible.
6. Provide a clear response and evidence of completion within the legally approved timeline.
7. Retain only the minimum case evidence for the approved period.

Local reset alone does not complete a request when cloud data or provider logs exist. Plaintext files exported to a user's device fall outside operator deletion control and must be disclosed.
