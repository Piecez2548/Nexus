# Commercial and Investor Due Diligence — Nexus Suite

**Date:** 2026-09-09  
**Scope:** Nexus All, Main, Tools and DataLens; source, current readiness reports and read-only production endpoints  
**Decision:** suitable for a controlled executive demonstration using synthetic data; not yet ready for paid/public launch or organizational production data

## Executive assessment

The product has a credible working breadth and unusually strong automated engineering evidence for a pre-commercial project. Its current evidence supports a product demonstration, not claims of product-market fit, enterprise readiness, legal compliance, assured availability or audit-grade governance. No revenue, user, retention, conversion, uptime or support-performance dataset was found. The KPI thresholds in `COMMERCIAL_READINESS.md` are explicitly pilot hypotheses.

## Findings

### P0 — release blockers for paid/public or organizational launch

1. **Legal operator and customer contract are undefined.** Privacy and terms are drafts; the accountable operator, contracting entity, support contact, governing terms and acceptance record are not implemented. This blocks public registration and paid use.
2. **DataLens organizational data terms are absent.** Controller/processor roles, DPA, subprocessors, transfer safeguards, retention/deletion and incident cooperation are unresolved. Its authorization declaration is not consent from people represented in a CSV.
3. **Ownership and distribution rights are not evidenced.** The product repositories do not contain approved root `LICENSE`/`NOTICE` and no checked-in chain-of-title record establishes rights to all code and assets. CycloneDX dependency SBOMs now exist for Nexus, Tools and the DataLens frontend, but an SBOM does not replace licence review, attribution notices or ownership evidence. `private: true` in npm prevents accidental registry publication but does not define customer rights or prove asset/component licensing.
4. **Operational accountability is not staffed.** No named on-call owner, public security/support channel, service hours, incident communication route, recovery objective or approved SLA was found. A GitHub scheduled smoke test is monitoring evidence, not a support operation.

### P1 — blockers for a controlled real-user pilot

1. Complete the privacy/security items in `LEGAL_PRIVACY_READINESS_2026-09-09.md`, including rights requests, retention, vendor/transfer register, incident procedure, DPIA and independent security review.
2. Establish release ownership, branch protection, change approval, rollback evidence and a production support runbook. The current direct-to-main solo workflow is not an investable team control.
3. Run documented backup/restore, account recovery, device-loss, sync-conflict and service-outage exercises on representative devices. The current Android debug APK now builds reproducibly with JDK 21, verifies under APK Signature Scheme v2 and is installed on test device `V2348`; a controlled release-signing process and complete operational exercises are still absent.
4. Define a consented analytics or research process before quoting activation, retention, reliability or willingness-to-pay. Financial values, merchants, transaction text, notes and Vault content must remain outside telemetry.
5. Decide the commercial boundary between free local Tools, Nexus sync and DataLens. Pricing and packaging remain hypotheses and must not be shown as approved offers.

### P2 — investment and scale readiness

- Produce a unit-economics model based on measured infrastructure, support and licensed-data costs; no ARR, CAC, LTV or margin claim is currently supportable.
- Define ownership for roadmap, security, privacy, support, release and customer success, with auditable decision records.
- Keep dependency SBOM generation in the release process, add an asset/licence inventory and approved `LICENSE`/`NOTICE`, and review copyleft, attribution, font, icon, image and sample-data obligations.
- Define availability and recovery objectives only after measuring platform behavior and staffing incident response. Avoid an enterprise SLA until contract and operating capability agree.
- Validate the Thailand-first consumer segment through interviews and pilot cohorts before expanding into organization workflows.

### P3 — presentation and demo credibility

- Label synthetic/demo data visibly and reset it before each demonstration.
- State that AI Analytics is primarily deterministic local rules/statistics; do not imply a generative model for rule-derived results. If the optional LLM path is enabled, disclose it separately.
- Describe DataLens fingerprinting as exact-byte identification. It does not establish source truth. Describe internal approval as a session record, not certification or an audit trail retained by the service.
- Present the internal 20/20 score as an engineering checklist only. It is not a WCAG certificate, penetration test, legal approval, commercial score or investment rating.

## Evidence reviewed

- Current production roots for Nexus All, Nexus Tools and DataLens returned HTTP 200 on 2026-09-09; DataLens `/api/health` returned 200 with `no-store` and its published security headers. This is a point-in-time reachability check, not uptime evidence.
- Nexus automated evidence records a full 2,781-test pass plus production smoke coverage; DataLens records frontend/backend checks, 42 passing backend tests and 2/2 browser E2E checks. These figures are point-in-time engineering evidence, not customer or commercial KPIs.
- DataLens source accurately warns that fingerprints do not prove factual correctness and that approval is not audit/legal certification. Its service does not provide durable approval storage.
- All three JavaScript products now generate validated, reproducible CycloneDX production-dependency SBOMs in CI and retain them as build artifacts for 90 days. Asset rights, source ownership and legal notices remain separate unresolved governance work.
- Nexus's legal/privacy audit identifies P0 gaps and explicitly states the products must not be represented as legally compliant.

## Release decision

**Controlled executive demo with synthetic data:** GO, provided the presenter uses the limitations above and does not solicit payment or upload real organizational/personal data.  
**Closed pilot with real personal data:** NO-GO until P0 and applicable P1 privacy, security and operational controls are assigned and closed.  
**Paid/public/enterprise launch:** NO-GO until every P0 item is closed, counsel signs off, ownership/licensing is evidenced and support operations are live.
