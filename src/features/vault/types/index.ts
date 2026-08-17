import type { SyncMeta } from "@/utils/syncMeta";

export type VaultEntryType = "password" | "note" | "recoveryKey";

// One shape for all three entry types (password manager, secure note,
// recovery key) rather than three parallel tables/repositories -- they
// differ only in which of these optional fields are populated, and the
// storage/encryption/sync/UI-list concerns are identical across all three.
export interface VaultEntry extends SyncMeta {
  id?: number;
  type: VaultEntryType;
  title: string;
  username?: string; // password
  password?: string; // password
  url?: string; // password
  content?: string; // note
  serviceName?: string; // recoveryKey -- which account/service this code is for
  code?: string; // recoveryKey
  note?: string; // free-text, all types
  createdAt: string;
}
