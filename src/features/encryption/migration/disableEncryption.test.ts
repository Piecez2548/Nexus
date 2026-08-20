import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "@/database/db";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import type { EncryptedRow } from "@/database/encryptedRepository";

const mockDownloadFile = vi.fn();
const mockDeleteEq = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpsert = vi.fn();
const mockRunFullSync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/utils/download", () => ({
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

// Covers both directions' Supabase calls: disableEncryption's best-effort
// escrow-row delete (from().delete().eq()), plus enableEncryption's own
// getSession/signInWithPassword/upsert -- needed here only for the
// round-trip test below, which calls the real enableEncryption after a
// disable to prove the cycle is fully reversible.
vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    from: () => ({
      delete: () => ({
        eq: (...args: unknown[]) => mockDeleteEq(...args),
      }),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

vi.mock("@/features/sync/syncEngine", () => ({
  runFullSync: (...args: unknown[]) => mockRunFullSync(...args),
}));

const { disableEncryption, decryptTable } = await import("./disableEncryption");
const { migrateTable, MigrationAlreadyInProgressError } = await import("./enableEncryption");
const { generateDek, decryptField } = await import("@/features/encryption/crypto/encryption");

const t = (key: string) => key;

// See enableEncryption.test.ts's own comment on this same list -- kept as a
// local, explicit list since the real SYNCED_TABLES isn't exported.
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
  "habits",
  "holdings",
  "calendarEvents",
  "scheduleItems",
  "goalMilestoneEvents",
  "vaultEntries",
  "workoutExercises",
  "workoutEntries",
  "netWorthItems",
  "netWorthSnapshots",
  "subscriptions",
  "budgetPeriodSnapshots",
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

function transactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    title: "Coffee",
    amount: 120,
    type: "expense",
    account: "Cash",
    date: "2026-07-01",
    status: "completed",
    syncId: "tx-1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("decryptTable", () => {
  beforeEach(async () => {
    await clearAllSyncedTables();
  });

  it("decrypts every encrypted row in the table back to plaintext and bumps updatedAt", async () => {
    const dek = await generateDek();
    await db.transactions.bulkAdd([
      transactionFixture({ syncId: "tx-1" }),
      transactionFixture({ syncId: "tx-2", title: "Salary", amount: 30000, type: "income" }),
    ] as never[]);
    await migrateTable("transactions", dek);

    const encrypted = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    expect(encrypted.every((r) => r.encryptedContent !== undefined)).toBe(true);

    await decryptTable("transactions", dek);

    const rows = (await db.transactions.toArray()) as unknown as Array<{
      title: string;
      amount: number;
      encryptedContent?: unknown;
      updatedAt: string;
    }>;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).not.toHaveProperty("encryptedContent");
      expect(row.title).toMatch(/Coffee|Salary/);
      expect(row.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    }
  });

  it("skips rows that are already plaintext (idempotent re-run)", async () => {
    const dek = await generateDek();
    await db.transactions.add(transactionFixture() as never);
    await migrateTable("transactions", dek);
    await decryptTable("transactions", dek);

    const afterFirstRun = await db.transactions.toArray();
    const firstUpdatedAt = (afterFirstRun[0] as { updatedAt: string }).updatedAt;

    // Re-running from scratch on already-plaintext rows must be a no-op --
    // no re-write, no updatedAt bump, no needless sync push.
    await decryptTable("transactions", dek);

    const afterSecondRun = await db.transactions.toArray();
    expect((afterSecondRun[0] as { updatedAt: string }).updatedAt).toBe(firstUpdatedAt);
  });

  it("keeps plaintextKeys (e.g. recipientKey) correctly restored after decrypting", async () => {
    const dek = await generateDek();
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
    await migrateTable("recipientProfiles", dek);

    await decryptTable("recipientProfiles", dek);

    const [row] = await db.recipientProfiles.toArray();
    expect((row as unknown as { recipientKey: string }).recipientKey).toBe("0812345678");
    expect((row as unknown as { alias?: string }).alias).toBe("Somchai");
  });

  it("processes more rows than one chunk correctly (chunking doesn't drop or duplicate rows)", async () => {
    const dek = await generateDek();
    const rows = Array.from({ length: 450 }, (_, i) => transactionFixture({ syncId: `tx-${i}`, title: `Item ${i}` }));
    await db.transactions.bulkAdd(rows as never[]);
    await migrateTable("transactions", dek);

    const progressCalls: number[] = [];
    await decryptTable("transactions", dek, (done) => progressCalls.push(done));

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(450);
    expect(stored.every((r) => !("encryptedContent" in (r as object)))).toBe(true);
    expect(progressCalls.at(-1)).toBe(450);
  });
});

describe("disableEncryption (full orchestration)", () => {
  beforeEach(async () => {
    await clearAllSyncedTables();
    resetStores();
    mockDownloadFile.mockReset();
    mockDeleteEq.mockReset().mockResolvedValue({ error: null });
    mockGetSession
      .mockReset()
      .mockResolvedValue({ data: { session: { user: { id: "user-123", email: "a@b.com" } } }, error: null });
    mockSignInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null });
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockRunFullSync.mockReset().mockResolvedValue(undefined);

    await useAppLockStore.getState().setupPin("1234", false);
    const dek = await generateDek();
    await useAppLockStore.getState().attachEncryption("1234", dek);
  });

  it("backs up, decrypts every table, verifies, disables encryption, and best-effort deletes the recovery key end to end", async () => {
    const dek = useEncryptionSessionStore.getState().dek!;
    await db.transactions.add(transactionFixture() as never);
    await migrateTable("transactions", dek);

    const phases: string[] = [];
    await disableEncryption({ pin: "1234", onProgress: (p) => phases.push(p.phase), translate: t });

    expect(mockDownloadFile).toHaveBeenCalledTimes(1);
    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    expect(useAppLockStore.getState().wrappedDek).toBeNull();
    expect(useAppLockStore.getState().kekSalt).toBeNull();
    expect(useAppLockStore.getState().kekIterations).toBeNull();
    expect(useEncryptionSessionStore.getState().dek).toBeNull();

    const [row] = await db.transactions.toArray();
    expect(row).not.toHaveProperty("encryptedContent");
    expect((row as unknown as { title: string }).title).toBe("Coffee");

    expect(mockDeleteEq).toHaveBeenCalledTimes(1);

    const distinctPhaseSequence = phases.filter((phase, i) => phase !== phases[i - 1]);
    expect(distinctPhaseSequence).toEqual(["backup", "decrypting", "verifying", "done"]);

    // The migration lock must be released on success.
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("rejects a wrong PIN up front, without touching any data or the lock", async () => {
    const dek = useEncryptionSessionStore.getState().dek!;
    await db.transactions.add(transactionFixture() as never);
    await migrateTable("transactions", dek);

    await expect(disableEncryption({ pin: "0000", translate: t })).rejects.toThrow("lock.pinIncorrect");

    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    const [row] = await db.transactions.toArray();
    expect(row).toHaveProperty("encryptedContent");
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("throws when encryption isn't currently enabled", async () => {
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });

    await expect(disableEncryption({ pin: "1234", translate: t })).rejects.toThrow("settings.encryptionNotEnabled");
  });

  it("refuses to start while a migration (either direction) is already in progress", async () => {
    await db.syncState.put({ key: "encryption:migrationLock", value: `lock-id:${Date.now()}` });

    await expect(disableEncryption({ pin: "1234", translate: t })).rejects.toThrow(MigrationAlreadyInProgressError);
  });

  it("allows a new migration once a stale lock has expired", async () => {
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    await db.syncState.put({ key: "encryption:migrationLock", value: `lock-id:${staleTimestamp}` });

    await expect(disableEncryption({ pin: "1234", translate: t })).resolves.not.toThrow();
  });

  it("does NOT disable encryption if a table still shows an encrypted row at verification time", async () => {
    const dek = useEncryptionSessionStore.getState().dek!;
    await db.transactions.add(transactionFixture() as never);
    await migrateTable("transactions", dek);

    // Simulate a write that silently didn't take effect (e.g. a storage
    // quota/version-conflict swallowed somewhere below Dexie): decryptTable
    // "succeeds" without throwing, but the row is left exactly as it was --
    // still encrypted. Verification must catch this and refuse to flip
    // encryptionEnabled.
    const bulkPutSpy = vi.spyOn(db.transactions, "bulkPut").mockResolvedValueOnce(0 as never);

    try {
      await expect(disableEncryption({ pin: "1234", translate: t })).rejects.toThrow(
        "settings.encryptionVerificationFailed"
      );
    } finally {
      bulkPutSpy.mockRestore();
    }

    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    expect(useAppLockStore.getState().wrappedDek).not.toBeNull();
    expect(useEncryptionSessionStore.getState().dek).not.toBeNull();

    const [row] = await db.transactions.toArray();
    expect(row).toHaveProperty("encryptedContent");

    // detachEncryption must never have run, so the escrow-delete best-effort
    // step (which only runs after it) must never have run either.
    expect(mockDeleteEq).not.toHaveBeenCalled();
    expect(await db.syncState.get("encryption:migrationLock")).toBeUndefined();
  });

  it("keeps the local disable successful even if deleting the recovery key on Supabase fails (best-effort)", async () => {
    mockDeleteEq.mockRejectedValue(new Error("network unreachable"));

    const dek = useEncryptionSessionStore.getState().dek!;
    await db.transactions.add(transactionFixture() as never);
    await migrateTable("transactions", dek);

    await expect(disableEncryption({ pin: "1234", translate: t })).resolves.not.toThrow();

    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    const [row] = await db.transactions.toArray();
    expect(row).not.toHaveProperty("encryptedContent");
  });

  it("resumes correctly after a simulated crash partway through decrypting tables, leaving encryptionEnabled/wrappedDek intact", async () => {
    const dek = useEncryptionSessionStore.getState().dek!;
    await db.transactions.add(transactionFixture() as never);
    await db.accounts.add({ name: "Cash", type: "cash", syncId: "acc-1", updatedAt: "2026-01-01T00:00:00.000Z" } as never);
    await migrateTable("transactions", dek);
    await migrateTable("accounts", dek);

    // Simulate "the process died right after one table was decrypted but
    // partway through the loop": "accounts" already decrypted by an earlier
    // (crashed) disableEncryption attempt, "transactions" not yet reached.
    await decryptTable("accounts", dek);

    // A real crash never reaches the `finally` that releases the lock, so
    // it's left held -- but by the time the user retries, it reads as stale.
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    await db.syncState.put({ key: "encryption:migrationLock", value: `crashed:${staleTimestamp}` });

    // Simulate the tab closing: the in-memory session DEK is gone, but
    // everything persisted -- encryptionEnabled, wrappedDek, the lock --
    // survives untouched. This is the entire point of flipping the flag
    // last: the app is still fully functional in this state.
    useEncryptionSessionStore.getState().clearDek();
    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    expect(useAppLockStore.getState().wrappedDek).not.toBeNull();

    // The user must unlock again before resuming -- the real recovery path
    // after reopening the app post-crash.
    await useAppLockStore.getState().unlock("1234", false);
    expect(useEncryptionSessionStore.getState().dek).not.toBeNull();

    await disableEncryption({ pin: "1234", translate: t });

    const [txRow] = await db.transactions.toArray();
    const [accRow] = await db.accounts.toArray();
    expect(txRow).not.toHaveProperty("encryptedContent");
    expect(accRow).not.toHaveProperty("encryptedContent");
    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    expect(useEncryptionSessionStore.getState().dek).toBeNull();
  });

  it("round-trips: data disabled back to plaintext re-encrypts and decrypts correctly through a fresh enableEncryption pass", async () => {
    const { enableEncryption } = await import("./enableEncryption");
    const dek = useEncryptionSessionStore.getState().dek!;

    await db.transactions.add(transactionFixture({ title: "Round Trip", amount: 999 }) as never);
    await migrateTable("transactions", dek);

    await disableEncryption({ pin: "1234", translate: t });

    const [plainRow] = await db.transactions.toArray();
    expect((plainRow as unknown as { title: string }).title).toBe("Round Trip");

    await useAppLockStore.getState().setupPin("5678", false);
    await enableEncryption({ pin: "5678", accountPassword: "correct-password", translate: t });

    expect(useAppLockStore.getState().encryptionEnabled).toBe(true);
    const [reEncryptedRow] = (await db.transactions.toArray()) as unknown as EncryptedRow[];
    expect(reEncryptedRow).toHaveProperty("encryptedContent");

    const finalDek = useEncryptionSessionStore.getState().dek!;
    const content = await decryptField<{ title: string; amount: number }>(finalDek, reEncryptedRow.encryptedContent!);
    expect(content.title).toBe("Round Trip");
    expect(content.amount).toBe(999);
  });
});
