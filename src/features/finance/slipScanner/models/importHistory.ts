// Import History record (GS-035): one entry per Smart Import run, capturing
// what was imported and how it went. Device-local operational data (not synced),
// stored in the additive Dexie table `slipImportHistory` (v17).

export type ImportSource = "gallery" | "picker" | "qr" | "ocr" | "batch";
export type ImportStatus = "success" | "partial" | "failed";

export interface ImportHistoryEntry {
  id?: number;
  importedAt: string; // ISO timestamp
  source: ImportSource;
  bank?: string; // dominant bank of the batch, if any
  amount?: number; // total imported amount
  importedCount: number;
  failedCount: number;
  status: ImportStatus;
  durationMs: number;
  errors?: string[];
}

// Derive the overall status of an import run from its counts.
export function deriveImportStatus(importedCount: number, failedCount: number): ImportStatus {
  if (importedCount === 0) return "failed";
  if (failedCount > 0) return "partial";
  return "success";
}
