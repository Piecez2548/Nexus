export type ScannerDiagnosticName =
  | "MANUAL_SCAN_STARTED"
  | "PERMISSION_CHECK"
  | "PERMISSION_GRANTED"
  | "PERMISSION_DENIED"
  | "MEDIA_ENUMERATION_STARTED"
  | "MEDIA_ENUMERATION_COMPLETED"
  | "DATE_FILTER_COMPLETED"
  | "IMAGE_ACCESS_STARTED"
  | "IMAGE_ACCESS_FAILED"
  | "QR_STARTED"
  | "QR_COMPLETED"
  | "QR_FAILED"
  | "OCR_STARTED"
  | "OCR_COMPLETED"
  | "OCR_FAILED"
  | "EXTRACTION_COMPLETED"
  | "CANDIDATE_CREATED"
  | "REVIEW_REACHED"
  | "PERSISTENCE_BLOCKED_BY_SAFE_MODE"
  | "SCAN_CANCELLED"
  | "SCAN_FAILED"
  | "SCAN_COMPLETED";

export type ScannerErrorCategory = "permission" | "native-media" | "image-read" | "qr" | "ocr" | "storage" | "cancelled" | "unknown";

export interface ScannerDiagnostic {
  name: ScannerDiagnosticName;
  at: string;
  durationMs?: number;
  count?: number;
  errorCategory?: ScannerErrorCategory;
}

const MAX_EVENTS = 100;
const events: ScannerDiagnostic[] = [];
const listeners = new Set<(event: ScannerDiagnostic) => void>();

// Scanner diagnostics intentionally accept only a stage, duration/count and a
// coarse error category. Never pass image bytes, filenames, QR/OCR text, or
// financial fields to this boundary.
export function recordScannerDiagnostic(
  name: ScannerDiagnosticName,
  details: Omit<ScannerDiagnostic, "name" | "at"> = {},
): ScannerDiagnostic {
  const event: ScannerDiagnostic = { name, at: new Date().toISOString(), ...details };
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  // Local console output is useful in WebView inspection and contains no
  // candidate or transaction content. It is not sent to a remote service.
  console.info("[NexusScanner]", event);
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Diagnostics must never break the scanner's business flow.
    }
  }
  return event;
}

export function getScannerDiagnostics(): ScannerDiagnostic[] {
  return [...events];
}

export function subscribeScannerDiagnostics(listener: (event: ScannerDiagnostic) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function errorCategory(error: unknown): ScannerErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("permission") || message.includes("securityexception")) return "permission";
  if (message.includes("gallery") || message.includes("mediastore") || message.includes("plugin")) return "native-media";
  if (message.includes("image") || message.includes("decode")) return "image-read";
  if (message.includes("ocr") || message.includes("tesseract")) return "ocr";
  if (message.includes("database") || message.includes("indexeddb") || message.includes("dexie")) return "storage";
  return "unknown";
}
