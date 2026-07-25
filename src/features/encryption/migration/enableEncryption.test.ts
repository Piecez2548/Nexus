import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { EncryptedRow } from "@/database/encryptedRepository";

const mockDownloadFile = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpsert = vi.fn();
const mockRunFullSync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/utils/download", () => ({
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

vi.mock("@/features/sync/syncEngine", () => ({
  runFullSync: (...args: unknown[]) => mockRunFullSync(...args),
}));

const { enableEncryption, migrateTable, MigrationAlreadyInProgressError } = await import("./enableEncryption");
const { generateDek, decryptField } = await import("@/features/encryption/crypto/encryption");

const SYNCED_TABLES = [
  "transactions",
  "accounts",
  "categories",
  "recipientProfiles",
  "budgets",
  "goals",
  "transactionTemplates",
  "trades",
  "todos",
] as const;

async function clearAllSyncedTables() {
  for (const table of SYNCED_TABLES) {
    await db.table(table).clear();
  }
  await db.syncTombstones.clear();
  await db.syncState.clear();
}

function resetStores() {
  useAppLockStore.setState({
    pinHash: null,
    salt: null,
    encryptionEnabled: false,
    wrappedDek: null,
    kekSalt: null,
    kekIterations: null,
    rememberUntil: null,
    sessionUnlocked: false,
  });
  useEncryptionSessionStore.getState().clearDek();
  useAuthStore.setState({ user: { id: "user-123", email: "a@b.com" } as never });
}

describe("migrateTable", () => {
  beforeEach(async () => {
    await clearAllSyncedTables();
  });

  it("encrypts every plaintext row in the table and bumps updatedAt", async () => {
    await db.transactions.bulkAdd([
      { title: "Coffee", amount: 120, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", syncId: "tx-1", updatedAt: "2026-01-01T00:00:00.000Z" },
      { title: "Salary", amount: 30000, type: "income", account: "Bank", date: "2026-07-01", status: "completed", syncId: "tx-2", updatedAt: "2026-01-01T00:00:00.000Z" },
    ] as never[]);

    const dek = await generateDek();
    await migrateTable("transactions", dek);

    const rows = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    expect(rows).toHaveLength(2);

    for (const row of rows) {
      expect(row).toHaveProperty("encryptedContent");
      expect(row.title).toBeUndefined();
      expect(row.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");

      const content = await decryptField<{ title: string; amount: number }>(dek, row.encryptedContent!);
      expect(content.title).toMatch(/Coffee|Salary/);
    }
  });

  it("skips rows that are already encrypted (idempotent re-run)", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      account: "Cash",
      date: "2026-07-01",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const dek = await generateDek();
    await migrateTable("transactions", dek);

    const afterFirstRun = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    const firstUpdatedAt = afterFirstRun[0].updatedAt;
    const firstEncryptedContent = afterFirstRun[0].encryptedContent;

    // Re-running from scratch must not re-encrypt (which would bump
    // updatedAt again and needlessly re-trigger a sync push).
    await migrateTable("transactions", dek);

    const afterSecondRun = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    expect(afterSecondRun[0].updatedAt).toBe(firstUpdatedAt);
    expect(afterSecondRun[0].encryptedContent).toEqual(firstEncryptedContent);
  });

  it("keeps plaintextKeys (e.g. recipientKey) unencrypted after migration", async () => {
    await db.recipientProfiles.add({
      recipientKey: "0812345678",
      alias: "Somchai",
      category: "Food",
      account: "Cash",
      transactionCount: 1,
      totalAmount: 100,
      lastUsedDate: "2026-07-01",
      confidenceScore: 1,
      syncId: "rp-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const dek = await generateDek();
    await migrateTable("recipientProfiles", dek);

    const [row] = await db.recipientProfiles.toArray();
    expect((row as unknown as { recipientKey: string }).recipientKey).toBe("0812345678");
    expect((row as unknown as { alias?: string }).alias).toBeUndefined();
  });

  it("processes more rows than one chunk correctly (chunking doesn't drop or duplicate rows)", async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({
      title: `Item ${i}`,
      amount: i,
      type: "expense" as const,
      account: "Cash",
      date: "2026-07-01",
      status: "completed" as const,
      syncId: `tx-${i}`,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    await db.transactions.bulkAdd(rows as never[]);

    const dek = await generateDek();
    const progressCalls: number[] = [];
    await migrateTable("transactions", dek, (done) => progressCalls.push(done));

    const stored = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    expect(stored).toHaveLength(450);
    expect(stored.every((r) => r.encryptedContent !== undefined)).toBe(true);
    // 450 rows / 200-row chunks -> progress reported at 0, 200, 400, 450.
    expect(progressCalls.at(-1)).toBe(450);
  });
});

describe("enableEncryption (full orchestration)", () => {
  beforeEach(async () => {
    await clearAllSyncedTables();
    resetStores();
    mockDownloadFile.mockReset();
    mockGetSession
      .mockReset()
      .mockResolvedValue({ data: { session: { user: { id: "user-123", email: "a@b.com" } } }, error: null });
    mockSignInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null });
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockRunFullSync.mockReset().mockResolvedValue(undefined);

    await useAppLockStore.getState().setupPin("1234", false);
  });

  it("downloads a backup, escrows the DEK, migrates every table, and enables encryption end to end", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      account: "Cash",
      date: "2026-07-01",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const phases: string[] = [];
    await enableEncryption({
      pin: "1234",
      accountPassword: "correct-password",
      onProgress: (p) => phases.push(p.phase),
    });

    expect(mockDownloadFile).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    expect(useEncryptionSessionStore.getState().dek).not.toBeNull();

    const [row] = await db.transactions.toArray();
    expect(row).toHaveProperty("encryptedContent");

    // "encrypting" is reported once per table (plus once per chunk within
    // each), so collapse consecutive duplicates before checking the
    // overall phase sequence.
    const distinctPhaseSequence = phases.filter((phase, i) => phase !== phases[i - 1]);
    expect(distinctPhaseSequence).toEqual(["backup", "escrow", "encrypting", "verifying", "done"]);

    // The migration lock must be released on success.
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("rejects a wrong account password up front, without ever escrowing or touching local data", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });

    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      account: "Cash",
      date: "2026-07-01",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    await expect(
      enableEncryption({ pin: "1234", accountPassword: "wrong-password" })
    ).rejects.toThrow(/รหัสผ่านบัญชี Sync ไม่ถูกต้อง/);

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);

    const [row] = await db.transactions.toArray();
    expect(row).not.toHaveProperty("encryptedContent");
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("aborts cleanly with nothing persisted locally when escrow fails", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "network unreachable" } });

    await db.transactions.add({
      title: "Coffee",
      amount: 120,
      type: "expense",
      account: "Cash",
      date: "2026-07-01",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    await expect(
      enableEncryption({ pin: "1234", accountPassword: "correct-password" })
    ).rejects.toThrow();

    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    expect(useAppLockStore.getState().wrappedDek).toBeNull();
    expect(useEncryptionSessionStore.getState().dek).toBeNull();

    const [row] = await db.transactions.toArray();
    expect(row).not.toHaveProperty("encryptedContent");

    // The lock must still be released even on failure, so a retry isn't
    // permanently blocked by the earlier failed attempt.
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("refuses to start a second migration while one is already in progress", async () => {
    await db.syncState.put({ key: "encryption:migrationLock", value: `lock-id:${Date.now()}` });

    await expect(
      enableEncryption({ pin: "1234", accountPassword: "correct-password" })
    ).rejects.toThrow(MigrationAlreadyInProgressError);
  });

  it("allows a new migration once a stale lock has expired", async () => {
    const staleTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    await db.syncState.put({ key: "encryption:migrationLock", value: `lock-id:${staleTimestamp}` });

    await expect(
      enableEncryption({ pin: "1234", accountPassword: "correct-password" })
    ).resolves.not.toThrow();
  });

  it("resumes correctly after a simulated crash partway through migrating tables", async () => {
    await db.transactions.bulkAdd([
      { title: "Coffee", amount: 120, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", syncId: "tx-1", updatedAt: "2026-01-01T00:00:00.000Z" },
    ] as never[]);
    await db.accounts.bulkAdd([
      { name: "Cash", type: "cash", syncId: "acc-1", updatedAt: "2026-01-01T00:00:00.000Z" },
    ] as never[]);

    // Simulate "the process died right after the DEK was attached but
    // partway through table migration": attachEncryption already ran (its
    // own public method, exactly as enableEncryption's first attempt
    // would have called it) and one table is already encrypted, but the
    // other one — and the migration lock — are still exactly as a crash
    // mid-loop would have left them.
    const dek = await generateDek();
    await useAppLockStore.getState().attachEncryption("1234", dek);
    await migrateTable("accounts", dek); // "accounts" finished before the crash

    // A real crash never reaches the `finally` that releases the lock, so
    // it's left held — but by the time the user comes back and retries,
    // enough time has passed for it to read as stale (the 5-minute
    // safety window this migration relies on to allow a resume at all).
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    await db.syncState.put({ key: "encryption:migrationLock", value: `crashed:${staleTimestamp}` });

    // Simulate the tab closing: the in-memory session DEK is gone, but
    // everything persisted (encryptionEnabled, wrappedDek, the lock)
    // survives, exactly as localStorage/IndexedDB would.
    useEncryptionSessionStore.getState().clearDek();

    // The user must unlock again before resuming — this is the real
    // recovery path a user would take after reopening the app post-crash.
    await useAppLockStore.getState().unlock("1234", false);
    expect(useEncryptionSessionStore.getState().dek).not.toBeNull();

    // Resuming calls the real enableEncryption, which should detect
    // encryptionEnabled=true, reuse the resident DEK, and skip straight
    // to migrating whatever tables aren't done yet — without a second
    // escrow call.
    await enableEncryption({ pin: "1234", accountPassword: "correct-password" });

    const [txRow] = await db.transactions.toArray();
    const [accRow] = await db.accounts.toArray();
    expect(txRow).toHaveProperty("encryptedContent");
    expect(accRow).toHaveProperty("encryptedContent");

    // Zero escrow calls on the resume — attachEncryption (which is what
    // actually escrows) was only ever called once, before the crash.
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
