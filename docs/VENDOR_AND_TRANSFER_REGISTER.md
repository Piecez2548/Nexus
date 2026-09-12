# Vendor and International Transfer Register

**Status:** evidence checklist; unknown fields block real-data pilot.

| Service | Purpose | Data categories | Contract/DPA | Processing regions | Subprocessors | Retention/deletion | Transfer safeguard | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Identity, sync database | Account and optional synced app data | REQUIRED | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| Vercel | Web hosting/functions | Requests, metadata, DataLens CSV transient processing | REQUIRED | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| Sentry (optional) | Error monitoring | Error/device metadata; sensitive values must be excluded | REQUIRED before enablement | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |
| AI provider (optional) | AI Coach fallback | Only approved minimized prompt data | REQUIRED before enablement | VERIFY | VERIFY | VERIFY | VERIFY | REQUIRED |

Attach executed agreements and configuration screenshots to the controlled compliance repository. Repository documentation alone does not prove provider configuration or contractual coverage.
