// Every local table that can sync to the cloud. Deliberately excludes
// `merchants`, which is bundled seed/reference data, not personal data.
export type SyncTableName =
  | "transactions"
  | "accounts"
  | "categories"
  | "recipientProfiles"
  | "budgets"
  | "goals"
  | "transactionTemplates"
  | "trades"
  | "todos"
  | "habits"
  | "holdings";

export interface Tombstone {
  id?: number;
  table: SyncTableName;
  syncId: string;
  deletedAt: string;
}

export interface SyncStateRow {
  key: string;
  value: string;
}
