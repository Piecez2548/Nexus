import type { EngineVersions } from "@/features/finance/slipScanner/cache/scanCache";

// The extraction-engine versions the cache stamps onto every scanned entry.
// Bumping any of these makes previously-cached entries stale (decide()
// returns "scan"), which is how a parser/OCR/payload upgrade transparently
// invalidates and re-scans exactly the affected images without a manual
// cache clear. This mechanism was never actually exercised in the app's
// history until now (all three sat at "0" since GS-006) -- these three
// numbers only do their job if they're bumped when the relevant code changes,
// which is a habit, not something the type system can enforce. Bump:
//   - `ocr`     when Tesseract preprocessing/config or slipOcrFields.ts's
//               field-extraction regexes change (e.g. the 2026-08-11
//               binarisation/adaptive-enhancement rework, bundled into this
//               bump since it shipped before this convention existed).
//   - `payload` when EMVCo/PromptPay TLV parsing (emvcoTlv.ts,
//               emvcoPayloadParser.ts) changes.
//   - `parser`  when bank identification or slipParser.ts's amount/date/
//               recipient extraction changes (this covers the most churn --
//               it's been touched in nearly every slip-quality fix so far).
export const CURRENT_ENGINE_VERSIONS: EngineVersions = { ocr: "1", payload: "0", parser: "1" };

// Cross-run retry policy for remembered failures: re-attempt a failed image on
// later scans up to this many times before giving up and skipping it. This is
// separate from the within-run retries the scan queue (GS-007) already does
// for transient errors.
export const MAX_FAILED_RETRIES = 3;
