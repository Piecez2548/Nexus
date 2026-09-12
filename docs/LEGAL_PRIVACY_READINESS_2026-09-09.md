# Legal and Privacy Readiness Audit — Nexus and DataLens

**Date:** 2026-09-09  
**Status:** engineering/legal readiness review; not legal advice, certification or regulatory approval

## Executive conclusion

The products contain meaningful privacy-by-design controls, but are not ready to be represented as legally compliant. The public applications lack completed legal notices and an identified operator, and the repository does not evidence production processes for rights requests, retention, processor governance, overseas transfers or breach response.

## Findings

### P0 — before external organizational use

1. **No publishable privacy notice or accountable operator.** No legal route/link was found in `src`, `public` or `index.html`. Complete the section 23 notice and a separate or integrated DataLens notice.
2. **No final terms or recorded acceptance.** Add versioned acceptance at registration, separate from optional consent.
3. **DataLens controller/processor role is unresolved.** Its authorization checkbox is neither a DPA nor consent from people represented in a CSV. Organizational use requires processor terms.
4. **Provider/transfer facts are unknown.** Verify Supabase, Vercel, Sentry/AI when enabled: contracting entity, subprocessor, region, retention, DPA and transfer safeguard.
5. **No executable incident process.** Add an owner, risk decision tree, containment, credential rotation/session revocation, immutable timestamps/evidence, processor-to-controller escalation SLA and notification templates. Under PDPA section 37(4), notify the Office without undue delay and, where feasible, within 72 hours when a breach is likely to create risk; notice to affected people without undue delay is a separate branch for high-risk breaches.

### P1 — before controlled pilot

1. Replace “request only”/“not stored” with measurable retention and deletion rules including Supabase Auth/audit/access logs, Vercel function logs and Blob, Sentry when enabled, synced-record tombstones, MFA backup-code hashes, device-pairing requests, weekly digests, reports and plaintext exports outside the operator's custody.
2. Implement an authenticated rights workflow for access/copy, correction, deletion, restriction, objection and withdrawal; local reset is insufficient.
3. Complete a DPIA/necessity assessment for financial, health, biometric, location, scanning, AI and arbitrary CSV data.
4. Qualify security claims: encryption is optional, backups are plaintext, PIN protects casual access, and cloud metadata remains visible.
5. Replace or explain DataLens “Approve report” / “Approved for executive use.” Exact safer copy: button **“Record internal approval”**; note **“Internal workflow approval recorded. This is not an audit opinion, legal approval, certification, or assurance of source-data accuracy.”** Display the same disclaimer next to the control and in exports.

### P2 — governance hardening

- Maintain records of processing, data-flow maps, retention schedule and vendor register.
- Record whether a DPO is required after scale/monitoring/sensitive-data facts are known.
- Define children/age and third-party-data policies.
- Inventory cookies and browser/device storage with lifetimes and purposes.
- Run recurring access, deletion/restore and breach-tabletop tests plus independent security review.

### P3 — presentation hygiene

- Publish plain Thai and matched English notices with date/version history.
- Link them before login, at registration, in settings, DataLens upload and footer.
- Publish a factual trust page without absolute or certification claims.

## Existing strengths

Device-local storage for core Nexus records in supported configurations, optional sync/AI controls, per-user RLS, optional application/native MFA controls, optional AES-GCM content encryption, local scan design, DataLens request-scoped processing and deterministic provenance reduce risk. Cloud sync, Tools Blob, DataLens requests and provider logs cross the device boundary. DataLens now enforces a verified Supabase token and requires `aal2` when the account has a verified TOTP factor. Nexus backup-code redemption is atomic and rate-limited in PostgreSQL, while its successful recovery marker remains application-scoped and does not upgrade the Supabase JWT; DataLens therefore still requires native TOTP. Most Nexus data-table RLS keys on `auth.uid()` rather than `aal2`, so MFA is an application entry control rather than universal database authorization. These controls do not prove legal compliance or provider operations.

## Required evidence

Final notices/terms and counsel review; acceptance/consent records; RoPA, retention/vendor/transfer records; rights/deletion tests; incident tabletop; production provider configuration; DPIA; board-named risk owner and residual-risk acceptance.

## Official references

- [Personal Data Protection Act B.E. 2562, Royal Gazette](https://ratchakitcha.soc.go.th/documents/17082307.pdf), especially sections 19–26 and 30–42.
- [PDPC Notification on Security Measures for Data Controllers B.E. 2565](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0028.PDF).
- [PDPC Government Platform privacy-policy example](https://gppc.pdpc.or.th/privacy-policy/).

Other contract, consumer, electronic-transaction, financial, health, employment or sector rules may apply. Thai counsel must assess the actual operator, users, business model and data flows.
