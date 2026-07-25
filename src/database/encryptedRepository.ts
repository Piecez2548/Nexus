import type { Table } from "dexie";

import { encryptField, decryptField, type EncryptedEnvelope } from "@/features/encryption/crypto/encryption";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { useAppLockStore } from "@/store/appLockStore";
import type { SyncMeta } from "@/utils/syncMeta";

// Thrown when encryption is enabled but no session DEK is resident (the
// app is locked, or somehow got into this state without unlocking first).
// Distinguishing this from a generic error lets a caller show something
// more useful than a stack trace.
export class EncryptionLockedError extends Error {
  constructor() {
    super("Encryption is enabled but the data can't be read or written until the app is unlocked");
    this.name = "EncryptionLockedError";
  }
}

interface EncryptedRow {
  id?: number;
  syncId?: string;
  updatedAt?: string;
  encryptedContent?: EncryptedEnvelope;
  [key: string]: unknown;
}

interface EncryptedRepositoryOptions<T> {
  // Fields kept as plaintext top-level columns instead of folded into
  // encryptedContent — for fields a Dexie `&`-unique index or `.where()`
  // lookup still needs to query directly (e.g. recipientKey, budgets'
  // category). Lower sensitivity than the rest of the row's content, and
  // this is the pragmatic trade-off documented in the encryption plan.
  plaintextKeys?: (keyof T)[];
}

function isEncryptionEnabled(): boolean {
  return useAppLockStore.getState().encryptionEnabled;
}

function requireSessionDek(): CryptoKey {
  const dek = useEncryptionSessionStore.getState().dek;
  if (dek === null) throw new EncryptionLockedError();
  return dek;
}

async function encryptRow<T extends SyncMeta & { id?: number }>(
  dek: CryptoKey,
  row: T,
  plaintextKeys: (keyof T)[]
): Promise<EncryptedRow> {
  const { id, syncId, updatedAt, ...rest } = row as T & Record<string, unknown>;

  const plaintextPart: Record<string, unknown> = {};
  const contentPart: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (plaintextKeys.includes(key as keyof T)) plaintextPart[key] = value;
    else contentPart[key] = value;
  }

  const encryptedContent = await encryptField(dek, contentPart);
  return { id, syncId, updatedAt, ...plaintextPart, encryptedContent };
}

// Rows without `encryptedContent` are either legacy plaintext (never
// migrated) or belong to an install that hasn't opted into encryption at
// all — returned as-is. This tolerance is what makes a mid-migration table
// (some rows encrypted, some not yet) safe to read from at any point.
async function decryptRow<T>(dek: CryptoKey, row: EncryptedRow): Promise<T> {
  if (row.encryptedContent === undefined) {
    return row as unknown as T;
  }

  const { encryptedContent, ...plaintextAndPlumbing } = row;
  const content = await decryptField<Record<string, unknown>>(dek, encryptedContent);
  return { ...plaintextAndPlumbing, ...content } as T;
}

/**
 * Wraps a Dexie table with transparent encryption for its non-plumbing
 * fields, matching the existing repositories' `{getAll, add, update}`
 * shape so call sites don't need to change. `remove` is deliberately not
 * included here — every repository's remove only ever needs `syncId`
 * (for the tombstone), which stays plaintext, so it never needs to go
 * through encryption at all.
 *
 * When encryption has never been enabled on this install, every method is
 * a byte-identical passthrough to calling the Dexie table directly.
 */
export function createEncryptedRepository<T extends SyncMeta & { id?: number }>(
  table: Table<T, number>,
  options: EncryptedRepositoryOptions<T> = {}
) {
  const plaintextKeys = options.plaintextKeys ?? [];

  async function getAll(): Promise<T[]> {
    const rows = await table.toArray();
    if (!isEncryptionEnabled()) return rows;

    const dek = requireSessionDek();
    return Promise.all(rows.map((row) => decryptRow<T>(dek, row as unknown as EncryptedRow)));
  }

  async function add(entity: T): Promise<number> {
    if (!isEncryptionEnabled()) return table.add(entity);

    const dek = requireSessionDek();
    const encrypted = await encryptRow(dek, entity, plaintextKeys);
    return table.add(encrypted as unknown as T);
  }

  async function update(id: number, entity: T): Promise<number> {
    const withId = { ...entity, id };
    if (!isEncryptionEnabled()) return table.put(withId);

    const dek = requireSessionDek();
    const encrypted = await encryptRow(dek, withId, plaintextKeys);
    return table.put(encrypted as unknown as T);
  }

  // For the rare repository method that queries the Dexie table directly
  // (e.g. a `.where()` lookup on a plaintext-exempt field) instead of going
  // through getAll — decrypts a single row the same way getAll would.
  async function decryptOptional(row: T | undefined): Promise<T | undefined> {
    if (row === undefined) return undefined;
    if (!isEncryptionEnabled()) return row;

    const dek = requireSessionDek();
    return decryptRow<T>(dek, row as unknown as EncryptedRow);
  }

  return { getAll, add, update, decryptOptional };
}
