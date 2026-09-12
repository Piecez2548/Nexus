# Nexus Privacy Notice — Draft for Thai Legal Review

**Status:** internal draft only. Do not publish or present it as legal approval. The operator must complete every `[[...]]` field and Thai counsel must review the final Thai and English versions before public or organizational use.

## 1. Data controller and contact

- Data controller: `[[legal entity/full individual name]]`
- Registered address: `[[address]]`
- Privacy contact: `[[email and/or request form]]`
- Data Protection Officer, if one is required or appointed: `[[name/title and contact, or reason not required]]`
- Effective date and notice version: `[[date/version]]`

Until these fields are complete, users have no accountable party or usable rights channel. That is a release blocker.

## 2. Scope and roles

This notice covers Nexus All, Nexus Main, Nexus Tools, the installed mobile application, cloud synchronization, and links to DataLens. DataLens is separately hosted and needs its own notice or an expressly integrated notice.

Before publication, the operator must document whether it acts as controller or processor for each use case. In particular, an organization uploading employee, customer, supplier, health, or financial CSV data to DataLens may remain the controller while the DataLens operator acts as processor. That relationship requires instructions and contractual terms, not a generic consent checkbox.

## 3. Processing inventory to complete

The final notice must describe each activity in a table containing: data subjects, data fields, source, purpose, legal basis, recipients/processors, transfer country or region, retention/deletion trigger, and whether provision is mandatory plus the consequence of refusal.

| Activity | Current product fact | Legal information still required |
|---|---|---|
| Account and authentication | Supabase processes email, password authentication records, tokens, OTP/MFA and account metadata | lawful basis, Supabase entity/region, auth-log retention, account-deletion process |
| Main local records | Financial, health, habit, location and personal records may be held in IndexedDB on the device | categories including sensitive data, purposes, device deletion limits, backup risk |
| Optional cloud sync | Records and metadata are sent to Supabase; content may be plaintext unless optional encryption is enabled | lawful basis, exact tables/metadata, retention, transfer mechanism and recipient |
| Security/audit history | Device-local events are capped at 500 rows; some provider logs may exist separately | purpose, retention by system, access and deletion rules |
| Permissions and scanning | Gallery/notification/location access is requested for specific features; slip recognition is designed to run locally | just-in-time notices, Android permission scope, any CDN/network requests |
| Optional AI Coach | Off by default; documented aggregate allow-list is sent only after opt-in when configured | provider, purposes, lawful basis, transfer/retention, withdrawal effect, human review warning |
| Error monitoring | Optional Sentry is enabled only when configured | exact fields, scrubbing configuration, processor/region and retention |
| DataLens | Authenticated CSV bytes and governance metadata are processed for the request; app code states no dataset persistence | separate notice, controller/processor role, transient-memory definition, infrastructure-log behavior |

Do not state that all data is “local only,” “never stored,” or “never leaves the device” without limiting the statement to the feature and configuration where it is true.

## 4. Legal bases and consent

Assign a lawful basis to each purpose under the Thai Personal Data Protection Act B.E. 2562 (PDPA). Do not use consent where processing is necessary to provide a requested service or another basis is more appropriate. Where consent is used, it must be specific, informed, freely given, separated from unrelated terms, recorded, and as easy to withdraw as to give. Withdrawal does not automatically require deletion where another lawful ground or legal retention duty applies.

Explicit consent or another applicable exception must be assessed before processing sensitive personal data under section 26, which can include health, disability, biometric, genetic, religious, criminal-record and other protected data. A DataLens checkbox stating “I am allowed to use this file” is an authorization declaration; it is not consent from every person represented in the file.

## 5. Retention and deletion

Replace vague labels such as “request only” with measurable periods or deletion triggers for every system. The schedule must cover Supabase Auth/audit/access logs, synced data and tombstones; MFA backup-code hashes; device-pairing requests; weekly digests; device databases, caches and audits; Vercel function logs and Blob; Sentry when enabled; DataLens request memory and generated reports; disaster recovery copies and plaintext exports outside the operator's custody; and the maximum time until deletion propagates.

The product can delete local data, but exported backups and copies on other devices remain under the holder's control. Operational deletion tests must verify production provider configuration rather than relying only on application code.

## 6. Sharing, processors and overseas transfers

Name or categorize every recipient and processor, including Supabase, Vercel, Sentry when enabled, the configured AI provider, email delivery, and app-distribution providers. State their role, purpose, data category, hosting region, and transfer safeguard. Complete vendor data-processing agreements and a transfer assessment before sending personal data outside Thailand. Do not infer data residency from a product name or deployment URL.

## 7. Rights and request handling

The final notice must explain how a person can request access, copies/portability where applicable, correction, deletion, restriction, objection, consent withdrawal, and complaint to the Personal Data Protection Committee. Publish an authenticated request channel, identity-verification method, response workflow, exceptions, response log and escalation owner. Local reset alone is not a complete rights process because provider-held account and log data may remain.

## 8. Security and incident handling

Describe safeguards accurately. Do not claim “bank-grade,” certified, impenetrable, or end-to-end encryption where cloud payloads may be plaintext. Disclose material limits: the device PIN is a local privacy gate, encryption is optional, exported backups are plaintext, and losing credentials may affect recovery.

Maintain an incident register and decision process covering containment, credential rotation/session revocation, immutable timestamps/evidence and processor-to-controller escalation. Under PDPA section 37(4), notify the Office without undue delay and, where feasible, within 72 hours after awareness when a breach is likely to create risk; where the breach is likely to create high risk, notify affected data subjects without undue delay with remedial guidance.

## 9. Children and third-party data

Set and enforce an eligibility policy. If children can use the service, counsel must define parental-consent and age-verification handling under PDPA section 20. Users must also be told that entering another person's information or uploading a CSV requires a lawful right to do so.

## 10. Cookies and device storage

Inventory cookies, IndexedDB, localStorage and sessionStorage by name, purpose, duration and whether strictly necessary. Do not display a marketing-cookie banner if there are no optional marketing cookies. If optional analytics or advertising is later added, block it until the applicable choice is recorded and provide an equally visible withdrawal control.

## 11. Publication gate

Publication requires completed operator identity, processing inventory and lawful-basis register; vendor/transfer records; retention schedule; rights procedure; incident-response procedure; children policy; final terms; in-product links at sign-up, sign-in, account settings, DataLens upload and site footer; version/change records; and Thai counsel sign-off. Product tests should assert that these links are reachable before authentication and from account settings.

## Official sources

- [Personal Data Protection Act B.E. 2562, Royal Gazette](https://ratchakitcha.soc.go.th/documents/17082307.pdf)
- [PDPC Notification on Security Measures for Data Controllers B.E. 2565, Royal Gazette](https://www.ratchakitcha.soc.go.th/DATA/PDF/2565/E/140/T_0028.PDF)
- [PDPC Government Platform privacy-policy example](https://gppc.pdpc.or.th/privacy-policy/)

These sources support the worklist but do not replace advice about the operator's facts, contracts, sector rules or cross-border arrangements.
