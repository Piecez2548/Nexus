import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { VaultEntry } from "@/features/vault/types";

// No plaintextKeys -- unlike recipientProfiles/budgets, every field here
// (including the title) is sensitive, so everything folds into
// encryptedContent. Vault access itself is gated on encryption being
// enabled (see Vault.tsx), so add/update always encrypt for real.
export const vaultEntryRepository = createRepository<VaultEntry>(db.vaultEntries, "vaultEntries");
