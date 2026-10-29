import { transactionService } from "@/features/finance/services/transactionService";

import type { SmartImportDeps } from "@/features/finance/slipScanner/import/smartImport";
import { scannerSafeVerificationMode } from "@/features/finance/slipScanner/services/scannerMode";
import { withSafeVerificationBoundary } from "@/features/finance/slipScanner/import/safeSmartImportDeps";

// Real persistence for Smart Import: create returns the new id, remove deletes
// for rollback. Goes through the existing transactionService (the same CRUD the
// rest of the finance module uses), so no new data path is introduced. The
// caller refreshes the transaction store once after a batch.
const productionSmartImportDeps: SmartImportDeps = {
  createTransaction: (transaction) => transactionService.create(transaction),
  deleteTransaction: (id) => transactionService.remove(id),
  listTransactions: () => transactionService.list(),
};

export const defaultSmartImportDeps = withSafeVerificationBoundary(productionSmartImportDeps, scannerSafeVerificationMode);
