# SYNC-CROSS-DEVICE-MEASURE-001 — Desktop-to-Android propagation

**Date:** 2026-09-13  
**Status:** Completed — fallback path observed  
**Model:** Luna

## Trace

The authenticated desktop production session created a temporary transaction named `SYNC-CROSS-DEVICE-MEASURE-001` at ฿37. The unlocked Android build then watched its Transactions view while the desktop edited the same row to ฿38.

The Android view displayed ฿38 after approximately 12.2 seconds from the measurement marker. The Android resource trace showed the 24-table pull beginning around 4.5 seconds after the marker, with `transactions` in the first batch. The temporary row was then deleted on desktop; the Android view removed it after the fallback pass and returned to the 32-row baseline.

## Finding

The edit propagated correctly, but this run did not show a targeted single-table Realtime pull before the timer-driven full pass. The targeted engine itself is covered by unit tests and the installed-device runtime trace; this cross-device result is evidence that Realtime delivery or subscription readiness needs a separate diagnosis.

## Validation

- Desktop create/edit/delete completed with visible success toasts.
- Android received the edit and later the deletion; baseline returned to 32 transactions.
- No plaintext encrypted payloads were exported.

## Next

`SYNC-REALTIME-DIAG-001` should inspect Realtime subscription status and event delivery on the installed Android build before changing pull behavior.
