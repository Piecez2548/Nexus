# Vendor and International Transfer Register

**Status:** evidence checklist; unknown fields block real-data pilot.

| Service | Purpose | Data categories | Contract/DPA | Processing regions | Subprocessors | Retention/deletion | Transfer safeguard | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Identity, sync database | Account and optional synced app data | REQUIRED | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| Vercel | Web hosting/functions | Requests, metadata, DataLens CSV transient processing | REQUIRED | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| Sentry (optional) | Error monitoring | Error/device metadata; sensitive values must be excluded | REQUIRED before enablement | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| AI provider (optional) | AI Coach fallback | Only approved minimized prompt data | REQUIRED before enablement | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |

Attach executed agreements and configuration screenshots to the controlled compliance repository. Repository documentation alone does not prove provider configuration or contractual coverage.

## Engineering facts verified 2026-09-13

- The linked Supabase project is `hgstufaswzmxjezanpyh`, status `ACTIVE_HEALTHY`, region `ap-northeast-1`, PostgreSQL 17.6. This confirms the configured project and database region only; it does not establish the contracting entity, DPA, subprocessors, retention or transfer safeguard.
- Current Vercel production deployables are Nexus All/Main (`nexus-lemon-eight-32.vercel.app`), Nexus-Tools (`nexus-tools-chi.vercel.app`) and DataLens (`datalens-piecez2548s-projects.vercel.app`). Runtime processing regions, log retention, Blob retention and Vercel contracting/DPA facts remain VERIFY.
- Sentry and the AI provider are optional code paths. Their enablement, account, region, retention, subprocessors and contracts remain UNKNOWN until the target deployment configuration is captured.

These facts advance the engineering portion of RB-006; they do not replace the required Privacy/Legal review.
