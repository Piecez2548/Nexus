import type { SmartImportDeps } from "@/features/finance/slipScanner/import/smartImport";
import { recordScannerDiagnostic } from "@/features/finance/slipScanner/services/scannerDiagnostics";

export class SafeVerificationPersistenceBlocked extends Error {
  constructor() {
    super("Transaction persistence is disabled in scanner safe verification mode");
    this.name = "SafeVerificationPersistenceBlocked";
  }
}

// Guard the actual transaction write seam, not only the Import button. This
// remains effective if a caller accidentally invokes Smart Import in safe mode.
export function withSafeVerificationBoundary(deps: SmartImportDeps, enabled: boolean): SmartImportDeps {
  if (!enabled) return deps;
  return {
    ...deps,
    async createTransaction(_transaction) {
      recordScannerDiagnostic("PERSISTENCE_BLOCKED_BY_SAFE_MODE", { errorCategory: "storage" });
      throw new SafeVerificationPersistenceBlocked();
    },
    async deleteTransaction(_id) {
      recordScannerDiagnostic("PERSISTENCE_BLOCKED_BY_SAFE_MODE", { errorCategory: "storage" });
      throw new SafeVerificationPersistenceBlocked();
    },
  };
}
