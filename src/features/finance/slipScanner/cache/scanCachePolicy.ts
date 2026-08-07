import type { EngineVersions } from "@/features/finance/slipScanner/cache/scanCache";

// The extraction-engine versions the cache stamps onto every scanned entry.
// All "0" today — extraction lands in later GS tasks (QR detector, EMVCo
// parser, OCR). Bumping any of these makes previously-cached entries stale
// (decide() returns "scan"), which is how a parser/OCR/payload upgrade
// transparently invalidates and re-scans exactly the affected images without
// a manual cache clear.
export const CURRENT_ENGINE_VERSIONS: EngineVersions = { ocr: "0", payload: "0", parser: "0" };

// Cross-run retry policy for remembered failures: re-attempt a failed image on
// later scans up to this many times before giving up and skipping it. This is
// separate from the within-run retries the scan queue (GS-007) already does
// for transient errors.
export const MAX_FAILED_RETRIES = 3;
