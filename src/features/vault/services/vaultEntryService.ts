import { vaultEntryRepository } from "@/features/vault/repositories/vaultEntryRepository";
import { createCrudService } from "@/database/createCrudService";
import type { VaultEntry } from "@/features/vault/types";

export const vaultEntryService = createCrudService<VaultEntry>(vaultEntryRepository);
