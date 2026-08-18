import type { SyncTableName } from "@/features/sync/types";

// The single source of truth for which fields of a table stay plaintext
// (outside encryptedContent) when encryption-at-rest is on. Read by
// createRepository (live add/update), backupService (export/import), and
// enableEncryption (the one-time migration) — previously hand-duplicated
// across all three, with a comment in each asking the reader to keep them
// in sync manually and nothing structurally enforcing it.
export const PLAINTEXT_KEYS: Partial<Record<SyncTableName, readonly string[]>> = {
  // Backs the `&recipientKey` unique Dexie index and the getByKey lookup
  // in recipientProfileRepository.ts, both of which need to query it
  // directly. A phone/PromptPay-style identifier, not the sensitive
  // content (that's the transaction history tied to it, which is encrypted).
  recipientProfiles: ["recipientKey"],
  // Backs the `&category` unique Dexie index (one budget per category) in
  // budgetRepository.ts, which would otherwise be unenforceable once
  // folded into an opaque encrypted blob.
  budgets: ["category"],
};
