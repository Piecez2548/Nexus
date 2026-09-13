# RB-018 — Privacy-safe pilot analytics evidence (2026-09-13)

The current engineering implementation provides a conservative baseline for a future pilot, but no pilot cohort or analytics consent has been activated in this pass.

## Engineering controls verified from source

- `src/platform/localTelemetry.ts` records aggregate timings, bounded generic error samples, memory and startup metrics entirely on-device; it has no network path and does not include account IDs, entity values or encrypted blobs.
- The production sync observability records generic timing/error state only. The existing evidence is linked from [SYNC-REALTIME-OBS-001](SYNC_REALTIME_OBS_001_2026-09-13.md) and [SYNC-REALTIME-OBS-002](SYNC_REALTIME_OBS_002_2026-09-13.md).
- Sentry is optional and disabled unless a DSN is configured. Any pilot must still validate its event allow-list and provider configuration before enabling it.

## Open pilot decisions

The cohort, research objective, notice/consent wording, event allow-list, retention period, deletion workflow and Privacy/Product approval are not appointed or signed. No KPI or willingness-to-pay result is claimed. RB-018 remains **In Progress** pending those decisions and a synthetic negative test proving that financial values, merchant names, transaction titles, notes, credentials, Vault content and arbitrary CSV content cannot enter telemetry.
