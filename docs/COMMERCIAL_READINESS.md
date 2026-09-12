# Nexus Commercial Readiness

Status: validation plan. This document does not claim product-market fit, legal approval, or enterprise readiness.

## Positioning

Nexus is a finance-first personal operating system for Thai users. The initial audience is salaried workers and freelancers who want to understand cash flow, bills, goals, and investments without giving up control of their data.

The entry product is everyday finance. Trading, productivity, health, Vault, and Tools are supporting workspaces. Nexus must not be marketed as corporate financial software or an investment adviser.

## Product packaging under evaluation

| Level | Intended use | Included direction |
| --- | --- | --- |
| Core candidate | Everyday money management | Cash flow, transactions, accounts, budgets, bills, goals, reports, tasks, habits |
| Advanced candidate | Experienced personal users | Core capabilities plus analytics, investing, trading, security, Vault, schedules, and specialist tools |
| Organization | Not committed | Teams, roles, approvals, entities, company financial statements, board reporting, and SLAs require separate validation and architecture |

These are commercial hypotheses only. The application exposes every available workspace in its navigation; packaging does not hide existing user features.

## Proposed business model to validate

Keep the offline core useful without payment. Candidate paid value is encrypted multi-device sync, managed backup and recovery, advanced reports, licensed market data, and household sharing. No price is approved until willingness-to-pay interviews and a landing-page test are complete.

## Decision metrics

Measure with privacy-preserving, opt-in analytics or structured user research. Do not send financial values, merchant names, transaction titles, notes, or Vault content.

| Stage | Metric | Initial decision threshold |
| --- | --- | --- |
| Activation | User creates/imports an account and first transaction, then views a useful summary | 60% of recruited test users |
| Week-one value | User returns and records or imports data in a second session | 40% |
| Four-week retention | User is active in week four | 25% |
| Reliability | Sessions without an unhandled error | 99.5% during pilot |
| Recovery | Pilot user can export and restore a backup without help | 90% in moderated test |
| Willingness to pay | Target users accept one tested paid package | Evidence required; no invented target revenue |

Thresholds are hypotheses for a small pilot, not public claims.

## Release gates

Before a public paid launch:

- Complete 15–30 interviews and at least two four-week pilot cohorts.
- Obtain Thai legal review of privacy notice, terms, consent, retention, deletion, and financial disclaimers.
- Complete an independent security review and remediate critical/high findings.
- Test backup, restore, account recovery, device loss, sync conflicts, and service outage procedures.
- Publish supported platforms, support channel, response expectations, known limitations, and incident-contact process.
- Verify accessibility with keyboard, screen reader, zoom, reduced motion, and representative low-end Android devices.
- Approve pricing only after willingness-to-pay evidence.
- Identify the contracting operator and verify ownership or written licence rights for source code, generated brand assets, fonts, icons, sample data and all third-party components. Publish the applicable software licence, notices and a versioned SBOM before commercial distribution.
- Define a staffed support and security contact, supported-platform matrix, service hours, incident escalation, backup/restore ownership and measurable response targets. Do not call those targets an SLA until approved in a customer contract and supported operationally.
- Separate demo readiness from launch readiness: use synthetic data for executive demonstrations until the legal, privacy, security and organizational DataLens gates are closed.

## Explicitly out of scope until validated

- Corporate accounting, treasury, payroll, or regulated financial advice.
- Organization tenants, employee roles, approval chains, and board reporting.
- Claims of bank-grade security, regulatory certification, guaranteed returns, or real-time market coverage.
- Live bank, brokerage, market, tax, or insurance integrations without contracts, provenance, and operational ownership.
